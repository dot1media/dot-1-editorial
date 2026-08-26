import type { FeedItem } from './rss';
import { fetchOgImage } from './rss';
import { searchOpenverseImage } from './images';
import type { FeedSource } from './sources';
import { CATEGORY_FALLBACK_IMAGES, fallbackImageFor } from './sources';
import { EDITORIAL_THESIS, turningsForPrompt } from './editorialThesis';
import {
  IndicatorScores,
  normalizeIndicators,
  computeIndexTotals,
  IndexTotals,
  ScoreConfidence,
} from '@/lib/scoring';

/**
 * Article generation + D1-4LS auto-scoring.
 *
 * Two modes, selected automatically:
 *
 *  1. AI mode (ANTHROPIC_API_KEY set): Claude writes an original news brief
 *     grounded STRICTLY in the feed item's own title/description, then
 *     scores all 20 D1-4LS indicators with a one-line rationale each.
 *     Hard anti-fabrication rules are in the prompt, the output is strict
 *     JSON, and every score is clamped/validated server-side.
 *
 *  2. Template mode (no key): an honest "curated brief" — the feed's own
 *     summary with attribution and a link out. No analysis is invented.
 *     Worldview indicators (BAI/PSI/HII) default to the neutral midpoint;
 *     SCI comes from the source baseline.
 *
 * In BOTH modes:
 *   - score_confidence is 'developing' — per the published methodology,
 *     automated first-pass scores are not dual-rated yet.
 *   - The three outlet-level SCI indicators (transparency, track record,
 *     editorial standards) are taken from the curated source registry, not
 *     guessed per-article.
 *   - Index totals are derived by computeIndexTotals(), never free-typed.
 */

export interface GeneratedArticle {
  title: string;
  summary: string;
  content: string;
  image: string;
  imageCredit: string;
  tags: string[];
  citations: string; // JSON array [{title,url,source}]
  editorNote: string; // reader-facing: why this story earned a place today
  indicators: IndicatorScores;
  totals: IndexTotals;
  scoreConfidence: ScoreConfidence;
  scoringNotes: string;
  generationMode: 'ai' | 'template';
}

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

/* ------------------------------------------------------------------ */
/* Template mode (no API key) — honest curation, no invented analysis */
/* ------------------------------------------------------------------ */

/** Strip machine tells so copy reads human: markdown emphasis, stray asterisks,
 *  headers/bullets, and em/en dashes. Applied to every generated field. */
export function humanizeProse(input: string): string {
  if (!input) return input;
  let t = input;
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');          // **bold**
  t = t.replace(/__([^_]+)__/g, '$1');               // __bold__
  t = t.replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, '$1$2'); // *italic*
  t = t.replace(/(^|[^\w_])_([^_\n]+)_(?=[^\w_]|$)/g, '$1$2');     // _italic_
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');          // # headers
  t = t.replace(/^\s*[*\u2022]\s+/gm, '');           // bullet markers
  t = t.replace(/\*/g, '');                           // any stray asterisk
  t = t.replace(/\s*[\u2014\u2013\u2015]\s*/g, ', '); // em/en/horizontal dash -> comma
  t = t.replace(/,\s*,/g, ',');
  t = t.replace(/\s+,/g, ',');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function buildTemplateArticle(item: FeedItem, source: FeedSource): GeneratedArticle {
  const snippet = item.description || 'Read the full report at the source below.';
  const summary = snippet.length > 280 ? snippet.slice(0, 277) + '…' : snippet;

  const content = [
    `Curated brief, via ${source.name}`,
    '',
    snippet,
    '',
    `This item was automatically curated from ${source.name}. Read the full original report for complete details and context:`,
    item.link,
    '',
    `This brief is pending full editorial review under the D1-4LS dual-rater protocol.`,
  ].join('\n');

  // Worldview lenses default to the neutral midpoint (1 of 2 per indicator
  // → 5/10 per index): the template pipeline makes no worldview judgment.
  // Per-article SCI: a curated snippet is secondary reporting (1) and
  // unverified by us (1); outlet-level indicators come from the registry.
  const indicators = normalizeIndicators({
    baiScripturalConsistency: 1, baiDoctrinalIntegrity: 1, baiMoralFramework: 1, baiAnthropology: 1, baiTeleology: 1,
    psiTextualLinkage: 1, psiEschatologicalFit: 1, psiHistoricalContinuity: 1, psiSpiritualImpact: 1, psiTheologicalRestraint: 1,
    sciPrimarySourceAccess: 1,
    sciVerification: 1,
    sciTransparency: source.sciBaseline.transparency,
    sciTrackRecord: source.sciBaseline.trackRecord,
    sciEditorialStandards: source.sciBaseline.editorialStandards,
    hiiHumanDignity: 1, hiiCompassionEmpathy: 1, hiiSocietalImpact: 1, hiiJusticeResponsibility: 1, hiiChristModeledCare: 1,
  });

  return {
    title: humanizeProse(item.title),
    summary: humanizeProse(summary),
    content: humanizeProse(content),
    image: item.imageUrl || fallbackImageFor(source.category, item.link),
    imageCredit: '',
    tags: [source.category, 'curated'],
    citations: JSON.stringify([{ title: item.title, url: item.link, source: source.name }]),
    editorNote: '',
    indicators,
    totals: computeIndexTotals(indicators),
    scoreConfidence: 'developing',
    scoringNotes:
      `Automated curation (template mode). BAI/PSI/HII set to neutral midpoint pending human rating. ` +
      `SCI outlet indicators from source registry for ${source.name}. Awaiting dual-rater review.`,
    generationMode: 'template',
  };
}

/* ------------------------------------------------------------------ */
/* AI mode — two-pass: independent writer, then independent scorer     */
/* ------------------------------------------------------------------ */
/*
 * Editorial architecture (v2):
 *
 *   PASS 1 — WRITER. Drafts the brief under a strict editorial charter:
 *   source-grounded facts only, structured depth (what happened → context →
 *   stakes → what's disputed), a loaded-language self-audit, steelmanning of
 *   genuine disputes, and a TONAL FIREWALL — the brief itself is measured
 *   reportage; the Christian editorial voice lives exclusively in the
 *   "Through the Lens" reflection, which is deeper, pastoral, and ends with
 *   a contemplative question. The writer does NOT score.
 *
 *   PASS 2 — SCORER. A separate call, prompted as a skeptical assessor who
 *   did not write the piece. Receives the raw source item AND the draft,
 *   scores all 17 article-level indicators with rationale-before-number
 *   ordering, calibration anchors, and an explicit political-parity clause.
 *   Also emits reader-facing one-line notes per index and an honest
 *   confidence grade. Writers grading their own homework was the single
 *   largest bias vector in v1; this separation removes it.
 *
 *   Failure ladder: scorer fails → publish the writer's brief with neutral
 *   baseline indicators, confidence 'low', and a transparent note. Writer
 *   fails → template mode, exactly as before.
 */

const ANTHROPIC_MODEL_SCORER = process.env.ANTHROPIC_MODEL_SCORER || ANTHROPIC_MODEL;

interface WriterOutput {
  title: string;
  summary: string;
  body: string;
  tags: string[];
  editorNote: string;
}

interface ScorerOutput {
  indicators: Record<string, { rationale: string; score: number }>;
  indexNotes: { BAI: string; PSI: string; SCI: string; HII: string };
  confidence: 'low' | 'moderate' | 'high';
}

const ARTICLE_INDICATORS = [
  'baiScripturalConsistency', 'baiDoctrinalIntegrity', 'baiMoralFramework', 'baiAnthropology', 'baiTeleology',
  'psiTextualLinkage', 'psiEschatologicalFit', 'psiHistoricalContinuity', 'psiSpiritualImpact', 'psiTheologicalRestraint',
  'sciPrimarySourceAccess', 'sciVerification',
  'hiiHumanDignity', 'hiiCompassionEmpathy', 'hiiSocietalImpact', 'hiiJusticeResponsibility', 'hiiChristModeledCare',
] as const;

function buildWriterPrompt(item: FeedItem, source: FeedSource): string {
  return `You are the staff writer for "Dot 1 News", a Christian news platform whose credibility rests on measured, verifiable reporting. You write the brief ONLY. A separate assessor will score it.

EDITORIAL THESIS (governs everything you write): ${EDITORIAL_THESIS.mission}
YOUR VOICE: ${EDITORIAL_THESIS.voice}
GOVERNING PARADIGM: ${EDITORIAL_THESIS.paradigm}

THE FIVE TURNINGS, apply every one of these as you write; they are how this brief turns the reader toward truth rather than away:
${turningsForPrompt()}

VOICE AND STYLE (this is what makes the writing read like a person, not a machine):
- Write in clean, natural prose. Vary your sentence length. Let some sentences run and others land short. Read it back in your head; if a line sounds like a template, rewrite it.
- Do NOT use em-dashes or en-dashes anywhere. Use commas, periods, colons, or parentheses instead.
- Do NOT use any markdown. No asterisks, no bold, no italics, no bullet points, no hash headers. Write plain paragraphs only.
- Avoid the tells of machine writing. Do not use "moreover", "furthermore", "in conclusion", "it is worth noting", "sent shockwaves", "in the wake of", "underscores", "highlights the importance of", "delve", "a stark reminder", "landscape", or "tapestry". Prefer plain, denotative verbs.
- No throat-clearing and no stacked hedges. Open with the fact.

SOURCE ITEM (your ONLY factual material):
- Outlet: ${source.name}
- Headline: ${item.title}
- Feed summary: ${item.description || '(none provided)'}
- URL: ${item.link}
- Published: ${item.publishedAt ? item.publishedAt.toISOString() : 'unknown'}
- App category: ${source.category}

Your charter:

0. HEADLINE DISCIPLINE: the source headline may be sensational. Your rewritten title must be calm, clear, and substantive. Describe what actually happened, not the shock of it. Strip words engineered for a jolt (slams, shocking, chaos, bombshell, and the like). A reader should trust the headline is not manipulating them.
1. STRUCTURE it in this order, without printing these labels: what happened (lede, one to two paragraphs), then key context or why now, then who is affected and what is at stake, then what remains disputed, unknown, or unverified. If the source is thin, write SHORTER rather than padding. Never invent names, numbers, quotes, dates, locations, or events absent from the source item.
2. ATTRIBUTION: credit ${source.name} within the first two paragraphs ("according to ${source.name}", "the outlet reports").
3. LOADED-LANGUAGE AUDIT: before finalizing, re-read your draft and strip adjectives and verbs that smuggle judgment (for example slammed, radical, so-called, shocking, extremist) unless they appear inside an attributed quote from the source. Prefer denotative verbs: said, announced, reported, ruled.
4. GENUINE DISPUTES: where the story involves contested positions, render the strongest honest version of each side's stated reasoning in one sentence each. This is fairness on real disputes. Do not manufacture balance on settled facts.
5. TONAL FIREWALL: the brief above is measured reportage, with no sermonizing, no editorial adjectives, and no us-versus-them framing. Your Christian editorial voice lives ONLY in the closing section.

Close the brief with a section. Put its heading on its own line, exactly the words below, with no asterisks and no other punctuation:
Through the Lens
Then write 90 to 140 words. This is where Dot 1's voice speaks: warm, pastoral, intellectually honest. Connect the story to a specific biblical principle or passage (you may cite real references like "Micah 6:8", but never fabricate quotations). Name the human-dignity dimension. Avoid date-setting, avoid certainty about God's intentions in current events, avoid partisan cues. End with ONE contemplative question the reader can carry.

OUTPUT, ONLY a JSON object, no fences, no preamble:
{
  "title": "concise headline, may lightly edit the original for clarity",
  "summary": "one to two sentences, max 280 chars, no em-dashes, no markdown",
  "body": "the full brief in clean prose, no markdown, no asterisks, no em-dashes, ending with the Through the Lens section",
  "tags": ["3-5", "lowercase", "tags"],
  "editorNote": "ONE plain sentence, max 160 chars, addressed to the reader: why this story earned a place in today's edition. Name the turning it serves. No hype, no marketing, no restating the headline, no em-dashes."
}`;
}

function buildScorerPrompt(item: FeedItem, source: FeedSource, draft: WriterOutput): string {
  return `You are the independent D1-4LS assessor for "Dot 1 News". You did NOT write the brief below — assess it skeptically. Eloquence is not evidence: score the story AS SOURCED, and penalize gaps the writing papers over.

ORIGINAL SOURCE ITEM:
- Outlet: ${source.name}
- Headline: ${item.title}
- Feed summary: ${item.description || '(none provided)'}

THE BRIEF UNDER ASSESSMENT:
${draft.body}

CALIBRATION ANCHORS (every indicator): 0 = absent or contrary · 1 = partial, mixed, or the normal state of neutral secular reporting · 2 = explicitly and clearly present. Most honest secular news earns 1s on worldview indicators — that is correct calibration, not failure.

PARITY CLAUSE: identical conduct must receive identical scores regardless of which political, national, or religious actor performed it. If your rationale for a score would change were the actors swapped, revise the score until it would not.

Score these 17 article-level indicators. For EACH, write the rationale FIRST, then the score — reasoning before numbers.
BAI (worldview coherence): baiScripturalConsistency, baiDoctrinalIntegrity, baiMoralFramework, baiAnthropology, baiTeleology.
PSI (prophetic relevance WITH restraint — reward theological humility, penalize speculation presented as certainty): psiTextualLinkage, psiEschatologicalFit, psiHistoricalContinuity, psiSpiritualImpact, psiTheologicalRestraint. Low PSI on ordinary news is correct.
SCI (score ONLY these two; outlet-level indicators are system-set): sciPrimarySourceAccess (2 = item contains primary documents/firsthand data · 1 = secondary reporting · 0 = anonymous/circular), sciVerification (2 = independently corroborated within the item · 1 = partial · 0 = unverified claims).
HII (human consequence): hiiHumanDignity, hiiCompassionEmpathy, hiiSocietalImpact, hiiJusticeResponsibility, hiiChristModeledCare.

ALSO produce:
- "indexNotes": ONE plain-English sentence per index, written for ordinary readers, explaining what drove that lens's result for THIS story (no jargon, no indicator names).
- "confidence": "low" if the source summary is under ~40 words or claims are uncorroborated; "moderate" for typical single-outlet reporting; "high" only when the item itself contains primary/corroborated material.

OUTPUT — ONLY a JSON object, no fences:
{
  "indicators": {
    "baiScripturalConsistency": {"rationale": "one line", "score": 0|1|2},
    "... all 17 keys in the same shape ..."
  },
  "indexNotes": {"BAI": "one sentence", "PSI": "one sentence", "SCI": "one sentence", "HII": "one sentence"},
  "confidence": "low|moderate|high"
}`;
}

/** One guarded Anthropic call returning parsed JSON of any shape, or null. */
async function callAnthropic(prompt: string, apiKey: string, timeoutMs: number, maxTokens: number, model: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`🤖 Anthropic ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    const text = (data?.content || []).map((b: any) => b?.text || '').join('');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('🤖 Anthropic response contained no JSON object');
      return null;
    }
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch (e: any) {
    console.error(`🤖 Anthropic call failed: ${e.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : e.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function validateWriter(w: any): WriterOutput | null {
  if (!w || typeof w.title !== 'string' || typeof w.body !== 'string' || w.body.length < 80) return null;
  return {
    title: String(w.title).slice(0, 300),
    summary: typeof w.summary === 'string' ? w.summary.slice(0, 300) : String(w.title).slice(0, 280),
    body: String(w.body),
    tags: Array.isArray(w.tags) ? w.tags.slice(0, 6).map((t: any) => String(t).toLowerCase().slice(0, 30)) : ['news'],
    editorNote: typeof w.editorNote === 'string' ? w.editorNote.trim().slice(0, 200) : '',
  };
}

function validateScorer(s: any): ScorerOutput | null {
  if (!s || typeof s.indicators !== 'object') return null;
  const out: Record<string, { rationale: string; score: number }> = {};
  for (const key of ARTICLE_INDICATORS) {
    const cell = s.indicators[key];
    const score = cell && Number.isInteger(cell.score) && cell.score >= 0 && cell.score <= 2 ? cell.score : null;
    if (score === null) return null; // any missing/invalid indicator fails the whole pass — no silent gaps
    out[key] = { rationale: String(cell.rationale || '').slice(0, 200), score };
  }
  const n = s.indexNotes || {};
  const note = (v: any) => String(v || '').replace(/[|\n]/g, ' ').slice(0, 220);
  const conf = ['low', 'moderate', 'high'].includes(s.confidence) ? s.confidence : 'moderate';
  return {
    indicators: out,
    indexNotes: { BAI: note(n.BAI), PSI: note(n.PSI), SCI: note(n.SCI), HII: note(n.HII) },
    confidence: conf,
  };
}

/** Neutral article-level indicators + registry SCI — the honest baseline
 *  used when the independent scorer is unavailable. */
function neutralIndicators(source: FeedSource): IndicatorScores {
  return normalizeIndicators({
    baiScripturalConsistency: 1, baiDoctrinalIntegrity: 1, baiMoralFramework: 1, baiAnthropology: 1, baiTeleology: 1,
    psiTextualLinkage: 1, psiEschatologicalFit: 1, psiHistoricalContinuity: 1, psiSpiritualImpact: 1, psiTheologicalRestraint: 1,
    sciPrimarySourceAccess: 1, sciVerification: 1,
    sciTransparency: source.sciBaseline.transparency,
    sciTrackRecord: source.sciBaseline.trackRecord,
    sciEditorialStandards: source.sciBaseline.editorialStandards,
    hiiHumanDignity: 1, hiiCompassionEmpathy: 1, hiiSocietalImpact: 1, hiiJusticeResponsibility: 1, hiiChristModeledCare: 1,
  });
}

function buildTwoPassArticle(
  item: FeedItem,
  source: FeedSource,
  draft: WriterOutput,
  scored: ScorerOutput | null,
): GeneratedArticle {
  const indicators = scored
    ? normalizeIndicators({
        ...Object.fromEntries(ARTICLE_INDICATORS.map((k) => [k, scored.indicators[k].score])),
        sciTransparency: source.sciBaseline.transparency,
        sciTrackRecord: source.sciBaseline.trackRecord,
        sciEditorialStandards: source.sciBaseline.editorialStandards,
      } as any)
    : neutralIndicators(source);

  const scoringNotes = scored
    ? `2-pass · BAI: ${scored.indexNotes.BAI} | PSI: ${scored.indexNotes.PSI} | SCI: ${scored.indexNotes.SCI} | HII: ${scored.indexNotes.HII}`
    : 'Automated scoring was unavailable for this article; neutral baseline scores applied pending review.';

  return {
    title: humanizeProse(draft.title),
    summary: humanizeProse(draft.summary),
    content: humanizeProse(draft.body),
    editorNote: humanizeProse(draft.editorNote),
    image: item.imageUrl || fallbackImageFor(source.category, item.link),
    imageCredit: '',
    tags: draft.tags,
    citations: JSON.stringify([{ title: item.title, url: item.link, source: source.name }]),
    indicators,
    totals: computeIndexTotals(indicators),
    // Map scorer honesty onto the methodology's states: automated passes
    // never self-certify 'high' (dual-rating owns that); 'low' → 'developing'.
    scoreConfidence: scored
      ? scored.confidence === 'moderate' || scored.confidence === 'high'
        ? 'moderate'
        : 'developing'
      : 'developing',
    scoringNotes,
    generationMode: 'ai',
  };
}

/**
 * Generate one article. aiTimeoutMs is the TOTAL AI budget for this item;
 * it is split ~55/45 between the writer and scorer passes, each guarded.
 */
export async function generateArticle(
  item: FeedItem,
  source: FeedSource,
  aiTimeoutMs = 80000,
): Promise<GeneratedArticle> {
  // Prefer the outlet's own photojournalism: if the feed carried no image,
  // pull the article page's og:image before any generic fallback. Best-effort;
  // any failure leaves the category fallback in place.
  if (!item.imageUrl) {
    try { const og = await fetchOgImage(item.link, 4000); if (og) item.imageUrl = og; } catch {}
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let article: GeneratedArticle | null = null;
  if (apiKey) {
    const started = Date.now();
    const writerBudget = Math.min(45000, Math.floor(aiTimeoutMs * 0.55));
    const rawWriter = await callAnthropic(buildWriterPrompt(item, source), apiKey, writerBudget, 1700, ANTHROPIC_MODEL);
    const draft = validateWriter(rawWriter);
    if (draft) {
      const remaining = aiTimeoutMs - (Date.now() - started) - 1500;
      const scorerBudget = Math.max(8000, Math.min(30000, remaining));
      const rawScorer = await callAnthropic(buildScorerPrompt(item, source, draft), apiKey, scorerBudget, 1900, ANTHROPIC_MODEL_SCORER);
      const scored = validateScorer(rawScorer);
      if (!scored) console.warn(`⚖️  Scorer pass unavailable for "${draft.title.slice(0, 50)}" — neutral baseline applied`);
      console.log(`✍️  2-pass ${scored ? 'complete' : 'degraded'} in ${Date.now() - started}ms: "${draft.title.slice(0, 50)}"`);
      article = buildTwoPassArticle(item, source, draft, scored);
    } else {
      console.warn(`✍️  Writer pass failed for "${item.title.slice(0, 50)}" — falling back to template`);
    }
  }
  if (!article) article = buildTemplateArticle(item, source);

  // No outlet photo (feed or og:image)? Find a relevant, license-clear image and
  // credit it. On any miss, the branded category fallback already on the article stays.
  if (!item.imageUrl) {
    try {
      const q = [(article.tags || []).slice(0, 3).join(' '), article.title, source.category].filter(Boolean).join(' ').trim();
      const sourced = await searchOpenverseImage(q);
      if (sourced && sourced.url) { article.image = sourced.url; article.imageCredit = sourced.credit; }
    } catch {}
  }
  return article;
}
