/**
 * backend/lib/ai/mediaSearch.ts
 *
 * Find license-clear media the AI desk can post to the news app, each carrying
 * the creator's name AND a link to credit them.
 *
 *  - Photos (The Lens): Openverse, CC-licensed / public-domain, keyless.
 *  - Videos (The Reel): Wikimedia Commons, freely licensed, keyless. Results
 *    prefer web-safe MP4; some are WebM/OGV (play in Chrome/Firefox, not iOS
 *    Safari). The editor can always add a Reel by pasting a hosted MP4 URL.
 *
 * Every result includes creditUrl so the photographer/videographer can be
 * linked, not just named.
 */

export interface MediaCandidate {
  provider: string;          // 'openverse' | 'pexels'
  url: string;               // direct media file URL (image or mp4)
  thumbnail: string;         // preview image
  creator: string;          // name to credit
  creditUrl: string;         // link to the creator / source page
  license: string;           // human-readable license, e.g. 'CC BY 4.0' or 'Pexels License'
  source: string;            // where it came from, e.g. 'Flickr', 'Pexels'
  title: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null; // videos only
}

async function getJson(url: string, timeoutMs: number, headers?: Record<string, string>): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', ...headers } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Photos for The Lens — Openverse (keyless), newest-relevant first. */
export async function searchPhotos(query: string, limit = 12): Promise<MediaCandidate[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const url =
    'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({ q: q.slice(0, 120), mature: 'false', size: 'large', page_size: String(Math.min(limit, 20)) }).toString();
  const data = await getJson(url, 8000, { 'User-Agent': 'Dot1News-ContentPipeline/1.0 (+https://dot1.media)' });
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  const out: MediaCandidate[] = [];
  for (const r of results) {
    if (!r?.url || !/^https?:\/\//i.test(r.url)) continue;
    const license = r.license ? `${String(r.license).toUpperCase()}${r.license_version ? ' ' + r.license_version : ''}` : '';
    out.push({
      provider: 'openverse',
      url: String(r.url),
      thumbnail: String(r.thumbnail || r.url),
      creator: String(r.creator || 'Unknown').slice(0, 120),
      creditUrl: String(r.creator_url || r.foreign_landing_url || '').slice(0, 500),
      license: license.slice(0, 60),
      source: String(r.source || 'Openverse').slice(0, 60),
      title: String(r.title || q).slice(0, 200),
      width: Number.isFinite(r.width) ? r.width : null,
      height: Number.isFinite(r.height) ? r.height : null,
      durationSeconds: null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

const stripHtml = (s: any): string => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Videos for The Reel — Wikimedia Commons (keyless), MP4 preferred. */
export async function searchVideos(query: string, limit = 12): Promise<MediaCandidate[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const url = 'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query', format: 'json', origin: '*',
      generator: 'search', gsrsearch: `filetype:video ${q.slice(0, 120)}`,
      gsrnamespace: '6', gsrlimit: String(Math.min(limit * 2, 30)),
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '640',
    }).toString();
  const data = await getJson(url, 9000, { 'User-Agent': 'Dot1News-ContentPipeline/1.0 (+https://dot1.media)' });
  const pages: any[] = data?.query?.pages ? Object.values(data.query.pages) : [];
  const out: MediaCandidate[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii?.url) continue;
    const ext = ii.extmetadata || {};
    out.push({
      provider: 'wikimedia',
      url: String(ii.url),
      thumbnail: String(ii.thumburl || ''),
      creator: (stripHtml(ext.Artist?.value) || 'Wikimedia Commons').slice(0, 120),
      creditUrl: String(ii.descriptionurl || '').slice(0, 500),
      license: (stripHtml(ext.LicenseShortName?.value) || '').slice(0, 60),
      source: 'Wikimedia Commons',
      title: (stripHtml(String(p.title || q).replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')) || q).slice(0, 200),
      width: Number.isFinite(ii.width) ? ii.width : null,
      height: Number.isFinite(ii.height) ? ii.height : null,
      durationSeconds: Number.isFinite(ii.duration) ? Math.round(ii.duration) : null,
    });
  }
  // Web-safe MP4 first, then the rest (WebM/OGV).
  const isMp4 = (u: string) => /\.mp4($|\?)/i.test(u);
  out.sort((a, b) => Number(isMp4(b.url)) - Number(isMp4(a.url)));
  return out.slice(0, limit);
}
