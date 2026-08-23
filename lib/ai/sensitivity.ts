/**
 * Content triage for the pipeline — two plain, auditable keyword passes that
 * run before an article is routed to publish. No AI, no surprises: you can
 * read exactly what trips each gate and edit the lists without a redeploy by
 * setting the PIPELINE_SENSITIVE_KEYWORDS / PIPELINE_BREAKING_SIGNALS env
 * overrides (JSON), or just editing the defaults below.
 *
 *   detectSensitiveTopics()  → which sensitive categories a story touches
 *                              (any hit ⇒ hold for admin review)
 *   detectBreakingSignals()  → whether a story is breaking (fast-path)
 *
 * Matching is word-boundary aware and case-insensitive, so "sex" matches
 * "sex" and "sexual" but not "Essex" or "sextuple". Phrases match as
 * substrings. Keep terms lowercase.
 */

export type SensitiveCategory =
  | 'sexuality'
  | 'drugs'
  | 'violence'
  | 'religion-contested'
  | 'politics-charged'
  | 'tragedy';

/** Default sensitive-topic lexicon. Conservative but readable; tune freely. */
const DEFAULT_SENSITIVE: Record<SensitiveCategory, string[]> = {
  sexuality: [
    'sex', 'sexual', 'sexuality', 'lgbtq', 'lgbt', 'transgender', 'trans ',
    'gay', 'lesbian', 'queer', 'gender identity', 'same-sex', 'abortion',
    'pornography', 'porn', 'prostitution', 'trafficking',
  ],
  drugs: [
    'drug', 'drugs', 'overdose', 'fentanyl', 'opioid', 'heroin', 'cocaine',
    'meth', 'methamphetamine', 'marijuana', 'cannabis', 'narcotic', 'addiction',
  ],
  violence: [
    'shooting', 'shooter', 'murder', 'homicide', 'stabbing', 'massacre',
    'terror', 'terrorist', 'assault', 'rape', 'abuse', 'kidnap', 'execution',
    'genocide', 'suicide', 'self-harm',
  ],
  'religion-contested': [
    'heresy', 'heretic', 'cult', 'apostasy', 'blasphemy', 'deconstruction',
    'exvangelical', 'schism', 'excommunicat', 'false prophet', 'occult',
    'witchcraft', 'satanic', 'islam', 'muslim', 'jihad', 'sharia',
  ],
  'politics-charged': [
    'impeach', 'insurrection', 'coup', 'election fraud', 'immigration raid',
    'deportation', 'white nationalis', 'extremis', 'militia',
  ],
  tragedy: [
    'dead', 'death toll', 'killed', 'fatal', 'casualties', 'disaster',
    'catastrophe', 'famine', 'refugee crisis',
  ],
};

/** Default breaking-news signal terms (matched in title + feed tags). */
const DEFAULT_BREAKING: string[] = [
  'breaking', 'breaking news', 'live:', 'live updates', 'developing',
  'developing story', 'just in', 'urgent', 'alert:', 'update:',
];

function loadOverride<T>(envKey: string, fallback: T): T {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (e: any) {
    console.error(`❌ ${envKey} is not valid JSON — using defaults:`, e.message);
    return fallback;
  }
}

function matches(haystack: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return false;
  // Phrases / terms with spaces or trailing space: substring match.
  if (t.includes(' ')) return haystack.includes(t.trimEnd());
  // Single tokens: word-boundary match to avoid "Essex" ⇒ "sex".
  const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  return re.test(haystack);
}

export interface SensitivityResult {
  isSensitive: boolean;
  categories: SensitiveCategory[];
  matchedTerms: string[];
}

/**
 * Scan a story's text for sensitive topics. Checks title + summary + tags;
 * the body is intentionally NOT scanned so a single incidental mention deep
 * in an article doesn't trip the gate — headline/summary intent is the signal.
 */
export function detectSensitiveTopics(
  title: string,
  summary: string,
  tags: string[] = [],
): SensitivityResult {
  const lexicon = loadOverride<Record<SensitiveCategory, string[]>>(
    'PIPELINE_SENSITIVE_KEYWORDS',
    DEFAULT_SENSITIVE,
  );
  const hay = `${title} ${summary} ${tags.join(' ')}`.toLowerCase();
  const categories: SensitiveCategory[] = [];
  const matchedTerms: string[] = [];

  for (const [cat, terms] of Object.entries(lexicon) as [SensitiveCategory, string[]][]) {
    const hits = terms.filter((term) => matches(hay, term));
    if (hits.length > 0) {
      categories.push(cat);
      matchedTerms.push(...hits);
    }
  }

  return {
    isSensitive: categories.length > 0,
    categories,
    matchedTerms: [...new Set(matchedTerms)],
  };
}

/**
 * Detect breaking-news signals in a story's title and feed-provided tags.
 * Deliberately narrow: we want genuine wire-service urgency, not clickbait,
 * so signals live in the title/category metadata, not body prose.
 */
export function detectBreakingSignals(title: string, tags: string[] = []): boolean {
  const signals = loadOverride<string[]>('PIPELINE_BREAKING_SIGNALS', DEFAULT_BREAKING);
  const hay = `${title} ${tags.join(' ')}`.toLowerCase();
  return signals.some((sig) => matches(hay, sig));
}
