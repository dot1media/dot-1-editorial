import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { newId } from "@/lib/api";
import { getFeeds, type FeedSource } from "@/lib/ai/sources";
import { fetchFeed, type FeedItem } from "@/lib/ai/rss";
import { generateArticle, type GeneratedArticle } from "@/lib/ai/generate";

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
  }
  if (title) {
    const r = await sql`SELECT 1 FROM stories WHERE lower(working_headline) = ${title.toLowerCase()} OR lower(final_headline) = ${title.toLowerCase()} LIMIT 1`;
    if (r.length) return true;
  }
  return false;
}

async function insertDraft(article: GeneratedArticle, item: FeedItem, source: FeedSource): Promise<string> {
  const id = newId("story");
  const scoreObj = { indicators: article.indicators, totals: article.totals, confidence: article.scoreConfidence };

  await sql`INSERT INTO stories (
    id, working_headline, final_headline, summary, body, classification, category, location,
    priority, status, hero_image, hero_image_credit, why_publish, review_state, scores, score_confidence,
    origin, source_url, source_name, ai_model, auto_publish, created_by
  ) VALUES (
    ${id}, ${article.title}, ${article.title}, ${article.summary}, ${article.content},
    ${"news"}, ${source.category}, ${""}, ${"routine"}, ${"verification"},
    ${article.image || ""}, ${article.imageCredit || ""}, ${article.editorNote || ""}, ${"not_verified"},
    ${JSON.stringify(scoreObj)}::jsonb, ${article.scoreConfidence},
    ${"ai"}, ${item.link || ""}, ${source.name}, ${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"}, ${true}, ${"ai-desk"}
  )`;

  // Record the AI scorer as the first rating in the dual-rater workflow.
  await sql`INSERT INTO story_ratings (id, story_id, rater_kind, rater_id, rater_name, scores, notes)
    VALUES (${newId("rate")}, ${id}, ${"ai"}, ${"ai-scorer"}, ${"AI scorer"}, ${JSON.stringify(article.indicators)}::jsonb, ${article.scoringNotes || ""})`;

  return id;
}

export async function runGeneration(opts: { max?: number } = {}): Promise<GenerateResult> {
  await ensureSchema();
  const max = Math.max(1, Math.min(opts.max ?? 3, 8));
  const result: GenerateResult = { considered: 0, generated: 0, skipped: 0, failed: 0, drafts: [], errors: [] };

  const feeds = getFeeds().filter((f) => f.enabled);
  // Gather candidate items across feeds (newest first), lightly interleaved by source.
  const candidates: { item: FeedItem; source: FeedSource }[] = [];
  for (const source of feeds) {
    try {
      const items = await fetchFeed(source.url);
      for (const item of items.slice(0, 6)) candidates.push({ item, source });
    } catch (e: any) {
      result.errors.push(`feed ${source.name}: ${e.message || e}`);
    }
  }
  candidates.sort((a, b) => (b.item.publishedAt?.getTime() || 0) - (a.item.publishedAt?.getTime() || 0));

  for (const { item, source } of candidates) {
    if (result.generated >= max) break;
    result.considered += 1;
    try {
      if (await alreadySeen(item)) { result.skipped += 1; continue; }
      const article = await generateArticle(item, source);
      const id = await insertDraft(article, item, source);
      result.generated += 1;
      result.drafts.push({ id, headline: article.title, source: source.name });
    } catch (e: any) {
      result.failed += 1;
      result.errors.push(`generate "${item.title?.slice(0, 40)}": ${e.message || e}`);
    }
  }

  return result;
}
