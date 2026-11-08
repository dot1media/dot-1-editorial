/**
 * Relevant, license-clear imagery for stories that arrive without the outlet's
 * own photo. Openverse aggregates CC-licensed and public-domain images and
 * returns machine-readable attribution, so every picture we use can be credited.
 * Best-effort and bounded: any failure returns null and the caller keeps its
 * branded category fallback.
 */
export interface SourcedImage {
  url: string;
  credit: string;
}

// Very common words carry no visual meaning, so they never count toward a match.
const IMAGE_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'after',
  'news', 'story', 'report', 'update', 'latest', 'photo', 'image', 'picture',
  'says', 'said', 'amid', 'new', 'how', 'why', 'what', 'who', 'plans', 'plan',
]);

/** Content tokens of a phrase: lowercased words of 4+ letters that aren't stopwords. */
function contentTokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]{4,}/g) || []).filter((t) => !IMAGE_STOPWORDS.has(t));
}

/** How many distinct query tokens appear in an Openverse result's own title/tags. */
function relevanceScore(queryTokens: string[], result: any): number {
  const hayParts: string[] = [String(result?.title || '')];
  if (Array.isArray(result?.tags)) for (const t of result.tags) hayParts.push(String(t?.name || ''));
  const hay = hayParts.join(' ').toLowerCase();
  let hits = 0;
  for (const tok of queryTokens) if (hay.includes(tok)) hits++;
  return hits;
}

export async function searchOpenverseImage(query: string, timeoutMs = 4500): Promise<SourcedImage | null> {
  const q = (query || '').trim();
  if (q.length < 3) return null;
  // A result must share real subject words with the query, or it's rejected as
  // off-topic. Short queries need one match; longer ones need at least two.
  const queryTokens = contentTokens(q);
  const minHits = queryTokens.length <= 2 ? 1 : 2;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url =
      'https://api.openverse.org/v1/images/?' +
      new URLSearchParams({
        q: q.slice(0, 120),
        mature: 'false',
        aspect_ratio: 'wide',
        size: 'large',
        page_size: '10',
      }).toString();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Dot1News-ContentPipeline/1.0 (+https://dot1.media)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    // Keep only usable, reasonably wide photos with a direct file url, then rank
    // by how well each result's own metadata matches the story's subject. A result
    // that clears the relevance bar and the highest score wins; if nothing clears
    // it, return null so the caller keeps its on-topic branded category fallback
    // instead of showing a picture of something unrelated.
    const usable = results.filter(
      (r) => r?.url && /^https?:\/\//i.test(r.url) && (!r.width || r.width >= 1000),
    );
    const candidates = usable.length ? usable : results.filter((r) => r?.url && /^https?:\/\//i.test(r.url));
    let pick: any = null;
    let best = -1;
    for (const r of candidates) {
      const score = relevanceScore(queryTokens, r);
      if (score >= minHits && score > best) { best = score; pick = r; }
    }
    if (!pick?.url) return null;
    const creator = (pick.creator || 'Unknown').toString().slice(0, 80);
    const via = (pick.source || 'Openverse').toString().slice(0, 40);
    const license = (pick.license || '').toString().toUpperCase();
    const ver = pick.license_version ? ' ' + pick.license_version : '';
    const credit = `${creator} / ${via}${license ? ` (${license}${ver})` : ''}`.slice(0, 300);
    return { url: String(pick.url), credit };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
