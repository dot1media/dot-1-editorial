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

export async function searchOpenverseImage(query: string, timeoutMs = 4500): Promise<SourcedImage | null> {
  const q = (query || '').trim();
  if (q.length < 3) return null;
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
    // Prefer a usable, reasonably wide photo with a direct file url.
    const pick =
      results.find((r) => r?.url && /^https?:\/\//i.test(r.url) && (!r.width || r.width >= 1000)) ||
      results.find((r) => r?.url && /^https?:\/\//i.test(r.url));
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
