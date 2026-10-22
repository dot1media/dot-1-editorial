/**
 * backend/lib/ai/mediaSearch.ts
 *
 * Find license-clear media the AI desk can post to the news app, each carrying
 * the creator's name AND a link to credit them.
 *
 *  - Photos (The Lens): Openverse, CC-licensed / public-domain, keyless.
 *  - Videos (The Reel): Pexels, free to use with attribution, needs
 *    PEXELS_API_KEY. Without the key, video search is unavailable and the
 *    editor can still add a Reel by pasting a hosted video URL with credit.
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

/** Videos for The Reel — Pexels (needs PEXELS_API_KEY). */
export async function searchVideos(query: string, limit = 12): Promise<MediaCandidate[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    throw new Error("Video search needs a Pexels API key (PEXELS_API_KEY). You can still add a Reel by pasting a video URL with credit below.");
  }
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const url = 'https://api.pexels.com/videos/search?' +
    new URLSearchParams({ query: q.slice(0, 120), per_page: String(Math.min(limit, 20)), orientation: 'landscape', size: 'medium' }).toString();
  const data = await getJson(url, 8000, { Authorization: key });
  const videos: any[] = Array.isArray(data?.videos) ? data.videos : [];
  const out: MediaCandidate[] = [];
  for (const v of videos) {
    const files: any[] = Array.isArray(v.video_files) ? v.video_files : [];
    // Prefer a web-friendly mp4 around 720p.
    const mp4s = files.filter((f) => (f.file_type || '').includes('mp4'));
    const pick =
      mp4s.find((f) => f.height && f.height >= 540 && f.height <= 800) ||
      mp4s.sort((a, b) => (a.height || 0) - (b.height || 0))[0];
    if (!pick?.link) continue;
    out.push({
      provider: 'pexels',
      url: String(pick.link),
      thumbnail: String(v.image || ''),
      creator: String(v.user?.name || 'Pexels contributor').slice(0, 120),
      creditUrl: String(v.user?.url || v.url || '').slice(0, 500),
      license: 'Pexels License',
      source: 'Pexels',
      title: String(q).slice(0, 200),
      width: pick.width || null,
      height: pick.height || null,
      durationSeconds: Number.isFinite(v.duration) ? v.duration : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
