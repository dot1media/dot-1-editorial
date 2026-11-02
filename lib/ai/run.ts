import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { recomputeReviewState } from "@/lib/reviewState";
import { newId } from "@/lib/api";
import { getFeeds, type FeedSource, type NewsCategory } from "@/lib/ai/sources";
import { fetchFeed, type FeedItem } from "@/lib/ai/rss";
import { generateArticle, type GeneratedArticle, type SourceMember } from "@/lib/ai/generate";
import { youTubeToSourceItem } from "@/lib/ai/youtube";

const NEWS_CATEGORIES: NewsCategory[] = ["world", "politics", "faith", "culture", "technology", "health", "business", "environment"];

// Every automated story must rest on at least this many distinct outlets. This
// is what makes the desk a discernment layer rather than a rewrite of one
// outlet: an event only runs once several newsrooms have covered it, and the
// reader can see each source.
const MIN_SOURCES = 3;

// ── Event clustering ──────────────────────────────────────────────────────
// Group feed items that cover the same event by the overlap of significant
// words in their headlines. Cheap and deterministic; precision is favored over
// recall so unrelated stories are not merged (a missed cluster just means that
// event is not written up this run).
const STOPWORDS = new Set(
  ("a an the and or but of to in on for with at by from as is are was were be been being this that these those it its he she they them his her their you your we our us not no new news say says said after over amid into out up down off about more most will would can could may might has have had just amid report reports").split(" "),
);
function titleTokens(title: string): Set<string> {
  return new Set(
    (title || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}
function sameEvent(a: Set<string>, b: Set<string>): boolean {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  if (inter === 0) return false;
  const union = a.size + b.size - inter;
  const jaccard = union ? inter / union : 0;
  return inter >= 3 || jaccard >= 0.34;
}
function sciScore(s: FeedSource): number {
  return s.sciBaseline.transparency + s.sciBaseline.trackRecord + s.sciBaseline.editorialStandards;
}
/** One member per distinct outlet, highest-credibility outlet first. */
function dedupeByOutlet(members: SourceMember[]): SourceMember[] {
  const seen = new Set<string>();
  const out: SourceMember[] = [];
  for (const m of members) {
    if (seen.has(m.source.name)) continue;
    seen.add(m.source.name);
    out.push(m);
  }
  out.sort((a, b) => sciScore(b.source) - sciScore(a.source));
  return out;
}

// The AI desk, in the portal. It pulls candidates from the RSS sources, skips anything already
// seen, generates a draft with the two-pass writer+scorer, and lands each as an editorial STORY
// with origin 'ai'. Drafts enter the normal newsroom workflow: the AI scorer's D1-4LS is recorded
// as the first rating (rater 1), a human provides the second, and the story publishes only after it
// clears review. Nothing here publishes to news directly; that happens through the portal's own
// publish path once reviewed.

export interface GenerateResult {
  considered: number;
  generated: number;
  skipped: number;
  failed: number;
  drafts: { id: string; headline: string; source: string }[];
  errors: string[];
}

// Dedupe: skip a feed item whose link or headline already exists as a story (any origin) so a
// re-run does not double-generate. Cheap exact-match checks; fuzzy matching can come later.
async function alreadySeen(item: FeedItem): Promise<boolean> {
  const link = item.link || "";
  const title = item.title || "";
  if (link) {
    const r = await sql`SELECT 1 FROM stories WHERE source_url = ${link} LIMIT 1`;
    if (r.length) return true;
    // Also a prior story that cited this link as one of several sources.
    const c = await sql`SELECT 1 FROM stories WHERE citations @> ${JSON.stringify([{ url: link }])}::jsonb LIMIT 1`;
    if (c.length) return true;
  }
  if (title) {
    const r = await sql`SELECT 1 FROM stories WHERE lower(working_headline) = ${title.toLowerCase()} OR lower(final_headline) = ${title.toLowerCase()} LIMIT 1`;
    if (r.length) return true;
  }
  return false;
}

async function insertDraft(article: GeneratedArticle, members: SourceMember[]): Promise<string> {
  const { item, source } = members[0];
  const id = newId("story");
  const scoreObj = {
    indicators: article.indicators,
    totals: article.totals,
    confidence: article.scoreConfidence,
    interpretation: article.interpretation,
    indexNotes: article.indexNotes,
    instrumentVersion: "2.1",
  };

  await sql`INSERT INTO stories (
    id, working_headline, final_headline, summary, body, classification, category, location,
    priority, status, hero_image, hero_image_credit, why_publish, review_state, scores, score_confidence,
    origin, source_url, source_name, ai_model, auto_publish, created_by, citations
  ) VALUES (
    ${id}, ${article.title}, ${article.title}, ${article.summary}, ${article.content},
    ${"news"}, ${source.category}, ${""}, ${"routine"}, ${"verification"},
    ${article.image || ""}, ${article.imageCredit || ""}, ${article.editorNote || ""}, ${"not_verified"},
    ${JSON.stringify(scoreObj)}::jsonb, ${article.scoreConfidence},
    ${"ai"}, ${item.link || ""}, ${source.name}, ${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"}, ${true}, ${"ai-desk"}, ${article.citations}::jsonb
  )`;

  // Record the AI scorer as the first rating in the dual-rater workflow.
  await sql`INSERT INTO story_ratings (id, story_id, rater_kind, rater_id, rater_name, scores, notes)
    VALUES (${newId("rate")}, ${id}, ${"ai"}, ${"ai-scorer"}, ${"AI scorer"}, ${JSON.stringify(article.indicators)}::jsonb, ${article.scoringNotes || ""})`;

  // Seed the reporting dossier so a generated story opens with its provenance
  // already laid out, not a set of empty tabs. All of this is auto-filled from
  // the source item and the brief; VERIFICATION stays the editor's job (claims
  // land as "unconfirmed", the story stays "not_verified").
  try {
    await seedDossier(id, article, members);
    await recomputeReviewState(id);
  } catch (e: any) {
    // Seeding is best-effort: a draft must exist even if a sub-section insert fails.
    console.error(`dossier seed failed for ${id}: ${e?.message || e}`);
  }

  return id;
}

const clip = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

// Fill the Sources, Evidence, Reporting-log and Claims tabs for a freshly
// generated draft. Honest provenance only: the originating outlet as the source,
// the original report as evidence, a log entry recording how the draft was made,
// and the brief's factual claims as an unconfirmed verification checklist.
async function seedDossier(storyId: string, article: GeneratedArticle, members: SourceMember[]): Promise<void> {
  const outletNames = members.map((m) => m.source.name).join(", ");

  // 1) Every cited outlet as its own source row.
  for (const { item, source } of members) {
    const b = source.sciBaseline;
    await sql`INSERT INTO story_sources (id, story_id, name, organization, title, contact, source_type, attribution, response_status, notes, reliability_notes, added_by, date_contacted)
      VALUES (${newId("src")}, ${storyId}, ${source.name}, ${source.name}, ${""}, ${""},
        ${"secondary_reporting"}, ${"on_record"}, ${"pending"},
        ${clip(`Outlet reporting this event. Original report: ${item.link}${item.description ? ` — ${item.description}` : ""}`, 600)},
        ${`Registry SCI baseline for ${source.name}: transparency ${b.transparency}/2, track record ${b.trackRecord}/2, editorial standards ${b.editorialStandards}/2.`},
        ${"ai-desk"}, ${null})`;
  }

  // 2) Each outlet's original report as a URL evidence item.
  for (const { item, source } of members) {
    if (!item.link) continue;
    const published = item.publishedAt ? item.publishedAt.toISOString().slice(0, 10) : "";
    await sql`INSERT INTO story_evidence (id, story_id, kind, label, url, notes, added_by)
      VALUES (${newId("ev")}, ${storyId}, ${"url"}, ${clip(`${source.name}: ${item.title}`, 180)}, ${item.link},
        ${clip(`Source article from ${source.name}${published ? `, published ${published}` : ""}.`, 300)}, ${"ai-desk"})`;
  }

  // 3) A provenance entry in the reporting log.
  const logEntry = clip(
    `AI Desk synthesized this draft from ${members.length} outlet${members.length > 1 ? "s" : ""} (${outletNames}) via the two-pass writer and independent D1-4LS scorer. ` +
      `Score confidence: ${article.scoreConfidence}. Sources, evidence, and candidate claims are auto-seeded; verification is pending editorial review.`,
    800,
  );
  await sql`INSERT INTO reporting_log (id, story_id, entry, author_email) VALUES (${newId("log")}, ${storyId}, ${logEntry}, ${"ai-desk"})`;

  // 4) The brief's factual claims, as an unconfirmed verification checklist.
  const primaryName = members[0].source.name;
  for (const c of article.claims || []) {
    const claim = clip(c.claim, 300);
    if (!claim) continue;
    await sql`INSERT INTO verification_claims (id, story_id, claim, status, sources, notes, updated_by)
      VALUES (${newId("clm")}, ${storyId}, ${claim}, ${"unconfirmed"}, ${c.source || primaryName},
        ${"Auto-extracted from the source brief. Verify against the original reports before publication."}, ${"ai-desk"})`;
  }
}

/**
 * Create one draft story from a single YouTube video. Same destination as the
 * wire: a two-pass written+scored story in the verification stage, origin 'ai',
 * grounded strictly in the video's title, description, and transcript.
 */
export async function generateFromYouTube(
  url: string,
  category?: string,
): Promise<{ id: string; headline: string; source: string }> {
  await ensureSchema();
  const cat: NewsCategory = NEWS_CATEGORIES.includes(category as NewsCategory) ? (category as NewsCategory) : "world";
  const { item, source } = await youTubeToSourceItem(url, cat);
  if (await alreadySeen(item)) throw new Error("A story from this video already exists in the newsroom.");
  // A single video is an intentional single-source story, exempt from the
  // multi-source minimum that governs the automated wire desk.
  const article = await generateArticle(item, source);
  const id = await insertDraft(article, [{ item, source }]);
  return { id, headline: article.title, source: source.name };
}

export async function runGeneration(opts: { max?: number } = {}): Promise<GenerateResult> {
  await ensureSchema();
  const max = Math.max(1, Math.min(opts.max ?? 3, 8));
  const result: GenerateResult = { considered: 0, generated: 0, skipped: 0, failed: 0, drafts: [], errors: [] };

  const feeds = getFeeds().filter((f) => f.enabled);
  // Gather candidate items across feeds.
  const candidates: SourceMember[] = [];
  for (const source of feeds) {
    try {
      const items = await fetchFeed(source.url);
      for (const item of items.slice(0, 8)) candidates.push({ item, source });
    } catch (e: any) {
      result.errors.push(`feed ${source.name}: ${e.message || e}`);
    }
  }

  // Cluster candidates by event (by headline-token overlap). Newest items seed
  // first so a cluster forms around the freshest framing.
  candidates.sort((a, b) => (b.item.publishedAt?.getTime() || 0) - (a.item.publishedAt?.getTime() || 0));
  interface Cluster { members: SourceMember[]; outlets: Set<string>; seed: Set<string> }
  const clusters: Cluster[] = [];
  for (const c of candidates) {
    const tk = titleTokens(c.item.title);
    if (tk.size < 2) continue;
    let placed = false;
    for (const cl of clusters) {
      if (sameEvent(tk, cl.seed)) { cl.members.push(c); cl.outlets.add(c.source.name); placed = true; break; }
    }
    if (!placed) clusters.push({ members: [c], outlets: new Set([c.source.name]), seed: tk });
  }

  // Only clusters covered by enough distinct outlets are eligible. The most
  // widely covered events come first.
  const eligible = clusters
    .filter((cl) => cl.outlets.size >= MIN_SOURCES)
    .sort((a, b) => b.outlets.size - a.outlets.size);
  result.skipped += clusters.length - eligible.length;

  for (const cl of eligible) {
    if (result.generated >= max) break;
    result.considered += 1;
    try {
      const perOutlet = dedupeByOutlet(cl.members); // one member per outlet, best outlet first
      // Skip the whole cluster if any of its sources was already used.
      let seen = false;
      for (const m of perOutlet) { if (await alreadySeen(m.item)) { seen = true; break; } }
      if (seen) { result.skipped += 1; continue; }

      const [primary, ...related] = perOutlet;
      const article = await generateArticle(primary.item, primary.source, 80000, related);
      const id = await insertDraft(article, perOutlet);
      result.generated += 1;
      result.drafts.push({ id, headline: article.title, source: `${primary.source.name} +${related.length} more` });
    } catch (e: any) {
      result.failed += 1;
      result.errors.push(`generate "${cl.members[0]?.item.title?.slice(0, 40)}": ${e.message || e}`);
    }
  }

  return result;
}
