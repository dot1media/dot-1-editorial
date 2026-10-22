/**
 * backend/lib/ai/mediaSearch.ts
 *
 * Find license-clear media the AI desk can post to the news app, each carrying
 * the creator's name AND a link to credit them. Several keyless providers run
 * in parallel and the results are merged, so a thin or throttled source never
 * leaves the editor empty-handed.
 *
 *  - Photos (The Lens):  Openverse  +  Wikimedia Commons
 *  - Videos (The Reel):  Wikimedia Commons  +  Internet Archive
 *
 * MP4 videos (web/iOS safe) are preferred; some Wikimedia clips are WebM/OGV
 * (play in Chrome/Firefox, not iOS Safari). The editor can always add a Reel by
 * pasting a hosted MP4 URL. Every result includes creditUrl.
 */

export interface MediaCandidate {
  provider: string;
  url: string;               // direct media file URL (image or mp4/webm)
  thumbnail: string;
  creator: string;
  creditUrl: string;
  license: string;
  source: string;
  title: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

const UA = 'Dot1News-ContentPipeline/1.0 (+https://dot1.media)';

async function getJson(url: string, timeoutMs: number, headers?: Record<string, string>): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': UA, ...headers } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const stripHtml = (s: any): string =>
  String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function dedupe(items: MediaCandidate[], limit: number): MediaCandidate[] {
  const seen = new Set<string>();
  const out: MediaCandidate[] = [];
  for (const it of items) {
    if (!it.url || seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
    if (out.length >= limit) break;
  }
  return out;
}

/** Round-robin interleave so each provider is represented near the top. */
function interleave(lists: MediaCandidate[][]): MediaCandidate[] {
  const out: MediaCandidate[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

/* ------------------------------- providers ------------------------------- */

async function openversePhotos(q: string, limit: number): Promise<MediaCandidate[]> {
  const url = 'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({ q: q.slice(0, 120), mature: 'false', size: 'large', page_size: String(Math.min(limit, 20)) }).toString();
  const data = await getJson(url, 8000);
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  const out: MediaCandidate[] = [];
  for (const r of results) {
    if (!r?.url || !/^https?:\/\//i.test(r.url)) continue;
    const license = r.license ? `${String(r.license).toUpperCase()}${r.license_version ? ' ' + r.license_version : ''}` : '';
    out.push({
      provider: 'openverse', url: String(r.url), thumbnail: String(r.thumbnail || r.url),
      creator: String(r.creator || 'Unknown').slice(0, 120),
      creditUrl: String(r.creator_url || r.foreign_landing_url || '').slice(0, 500),
      license: license.slice(0, 60), source: String(r.source || 'Openverse').slice(0, 60),
      title: String(r.title || q).slice(0, 200),
      width: Number.isFinite(r.width) ? r.width : null, height: Number.isFinite(r.height) ? r.height : null,
      durationSeconds: null,
    });
  }
  return out;
}

/** Wikimedia Commons, for images (filetype:bitmap) or video (filetype:video). Keyless, reliable. */
async function wikimediaMedia(q: string, limit: number, mode: 'image' | 'video'): Promise<MediaCandidate[]> {
  const thumbW = mode === 'image' ? '1024' : '640';
  const url = 'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query', format: 'json', origin: '*',
      generator: 'search', gsrsearch: `filetype:${mode === 'image' ? 'bitmap' : 'video'} ${q.slice(0, 120)}`,
      gsrnamespace: '6', gsrlimit: String(Math.min(limit * 2, 30)),
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: thumbW,
    }).toString();
  const data = await getJson(url, 9000);
  const pages: any[] = data?.query?.pages ? Object.values(data.query.pages) : [];
  const out: MediaCandidate[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii?.url) continue;
    const mime = String(ii.mime || '');
    if (mode === 'image' && !/^image\/(jpeg|png|webp)$/.test(mime)) continue;
    const ext = ii.extmetadata || {};
    const title = (stripHtml(String(p.title || q).replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')) || q).slice(0, 200);
    out.push({
      provider: 'wikimedia',
      url: mode === 'image' ? String(ii.thumburl || ii.url) : String(ii.url),
      thumbnail: String(ii.thumburl || ''),
      creator: (stripHtml(ext.Artist?.value) || 'Wikimedia Commons').slice(0, 120),
      creditUrl: String(ii.descriptionurl || '').slice(0, 500),
      license: (stripHtml(ext.LicenseShortName?.value) || 'Wikimedia Commons').slice(0, 60),
      source: 'Wikimedia Commons', title,
      width: Number.isFinite(ii.width) ? ii.width : null, height: Number.isFinite(ii.height) ? ii.height : null,
      durationSeconds: Number.isFinite(ii.duration) ? Math.round(ii.duration) : null,
    });
  }
  return out;
}

/** Internet Archive moving-image collection. Two-step: search, then resolve an MP4 per item. */
async function internetArchiveVideos(q: string, limit: number): Promise<MediaCandidate[]> {
  const searchUrl = 'https://archive.org/advancedsearch.php?' +
    new URLSearchParams({
      q: `(${q.slice(0, 120)}) AND mediatype:(movies)`,
      'fl[]': 'identifier', rows: String(Math.min(limit, 6)), page: '1', output: 'json', sort: 'downloads desc',
    }).toString().replace(/fl%5B%5D/g, 'fl[]');
  const data = await getJson(searchUrl, 8000);
  const docs: any[] = data?.response?.docs || [];
  const ids = docs.map((d) => d.identifier).filter(Boolean).slice(0, 4);
  const metas = await Promise.allSettled(ids.map((id) => getJson(`https://archive.org/metadata/${id}`, 7000)));
  const out: MediaCandidate[] = [];
  metas.forEach((m, i) => {
    if (m.status !== 'fulfilled' || !m.value) return;
    const meta = m.value;
    const id = ids[i];
    const files: any[] = Array.isArray(meta.files) ? meta.files : [];
    const mp4 = files.find((f) => /\.mp4$/i.test(f.name || '') && (f.source === 'derivative' || f.source === 'original'));
    if (!mp4?.name) return;
    const md = meta.metadata || {};
    const creator = Array.isArray(md.creator) ? md.creator[0] : md.creator;
    out.push({
      provider: 'internetarchive',
      url: `https://archive.org/download/${id}/${encodeURIComponent(mp4.name)}`,
      thumbnail: `https://archive.org/services/img/${id}`,
      creator: String(creator || 'Internet Archive').slice(0, 120),
      creditUrl: `https://archive.org/details/${id}`,
      license: String(md.licenseurl ? 'See source' : 'Internet Archive').slice(0, 60),
      source: 'Internet Archive',
      title: String(md.title || q).slice(0, 200),
      width: null, height: null,
      durationSeconds: Number.isFinite(Number(mp4.length)) ? Math.round(Number(mp4.length)) : null,
    });
  });
  return out;
}

/* -------------------------------- public -------------------------------- */

const isMp4 = (u: string) => /\.mp4($|\?)/i.test(u);

export async function searchPhotos(query: string, limit = 12): Promise<MediaCandidate[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const settled = await Promise.allSettled([openversePhotos(q, limit), wikimediaMedia(q, limit, 'image')]);
  const lists = settled.map((s) => (s.status === 'fulfilled' ? s.value : []));
  return dedupe(interleave(lists), limit);
}

export async function searchVideos(query: string, limit = 12): Promise<MediaCandidate[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const settled = await Promise.allSettled([wikimediaMedia(q, limit, 'video'), internetArchiveVideos(q, limit)]);
  const lists = settled.map((s) => (s.status === 'fulfilled' ? s.value : []));
  const merged = dedupe(interleave(lists), limit * 2);
  // Web-safe MP4 first, then WebM/OGV.
  merged.sort((a, b) => Number(isMp4(b.url)) - Number(isMp4(a.url)));
  return merged.slice(0, limit);
}
