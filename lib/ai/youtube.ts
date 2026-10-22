/**
 * backend/lib/ai/youtube.ts
 *
 * Turn a YouTube link into source material the AI desk can write a brief from.
 *
 * An editor pastes a video URL; we pull the title, channel, description and,
 * when captions exist, the transcript, and hand that to the same two-pass
 * writer+scorer used for the wire. The video is the ONLY factual material, so
 * the brief stays grounded in what was actually said, exactly like an RSS item.
 *
 * Everything here is best-effort and guarded: oembed gives us title/channel
 * reliably; the watch page gives description + captions when available. If the
 * transcript cannot be read, the brief is written from the description and runs
 * shorter rather than inventing anything.
 */

import type { FeedItem } from './rss';
import type { FeedSource, NewsCategory } from './sources';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Pull the 11-char video id out of any common YouTube URL shape, or a bare id. */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') {
        const v = u.searchParams.get('v');
        return v && /^[\w-]{11}$/.test(v) ? v : null;
      }
      const m = u.pathname.match(/\/(embed|shorts|v|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* fall through to loose match */
  }
  const m = s.match(/[\w-]{11}/);
  return m ? m[0] : null;
}

async function httpText(url: string, timeoutMs = 9000, extraHeaders?: Record<string, string>): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9',
        // CONSENT cookie skips the EU consent interstitial that otherwise
        // replaces the watch page HTML on some server regions.
        cookie: 'CONSENT=YES+1',
        ...extraHeaders,
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Find `marker = {...}` in a page and return the balanced JSON object text. */
function extractJsonAfter(html: string, marker: string): any | null {
  const at = html.indexOf(marker);
  if (at === -1) return null;
  let i = html.indexOf('{', at);
  if (i === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(i, j + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

interface CaptionTrack { baseUrl: string; languageCode?: string; kind?: string }

/** Fetch and flatten a caption track to plain text (json3 preferred, XML fallback). */
async function fetchTranscript(tracks: CaptionTrack[]): Promise<string> {
  if (!tracks?.length) return '';
  // Prefer a real English track; else any English (incl. auto); else the first.
  const pick =
    tracks.find((t) => t.languageCode?.startsWith('en') && t.kind !== 'asr') ||
    tracks.find((t) => t.languageCode?.startsWith('en')) ||
    tracks[0];
  if (!pick?.baseUrl) return '';

  const j = await httpText(pick.baseUrl + '&fmt=json3', 9000);
  if (j) {
    try {
      const data = JSON.parse(j);
      const parts: string[] = [];
      for (const ev of data.events || []) {
        if (!ev.segs) continue;
        for (const seg of ev.segs) if (seg.utf8) parts.push(seg.utf8);
      }
      const text = parts.join('').replace(/\s+/g, ' ').trim();
      if (text) return text;
    } catch { /* fall through to XML */ }
  }
  const xml = await httpText(pick.baseUrl, 9000);
  if (xml) {
    const text = xml
      .replace(/<text[^>]*>/g, ' ')
      .replace(/<\/text>/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#([0-9]+);/g, (_, n) => String.fromCharCode(+n))
      .replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return '';
}

export interface YouTubeContent {
  videoId: string;
  title: string;
  author: string;
  description: string;
  transcript: string;
  thumbnail: string;
  publishDate: string | null;
}

/** Gather everything we can about a video, each piece best-effort. */
export async function fetchYouTubeContent(id: string): Promise<YouTubeContent> {
  const watchUrl = `https://www.youtube.com/watch?v=${id}&hl=en&bpctr=9999999999&has_verified=1`;

  // oembed: the reliable source of title + channel (no API key needed).
  let title = '', author = '';
  const oembed = await httpText(
    `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`,
    7000,
  );
  if (oembed) {
    try { const o = JSON.parse(oembed); title = o.title || ''; author = o.author_name || ''; } catch { /* ignore */ }
  }

  // Watch page: description, captions, publish date, and title/author fallback.
  let description = '', transcript = '', publishDate: string | null = null;
  const html = await httpText(watchUrl, 9000);
  if (html) {
    const player = extractJsonAfter(html, 'ytInitialPlayerResponse');
    const vd = player?.videoDetails;
    if (vd) {
      if (!title) title = vd.title || '';
      if (!author) author = vd.author || '';
      if (vd.shortDescription) description = String(vd.shortDescription);
    }
    publishDate =
      player?.microformat?.playerMicroformatRenderer?.publishDate ||
      player?.microformat?.playerMicroformatRenderer?.uploadDate ||
      null;
    const tracks: CaptionTrack[] =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (tracks.length) {
      try { transcript = await fetchTranscript(tracks); } catch { /* best effort */ }
    }
  }

  // Thumbnail: maxres is sharpest but not every video has it; fall back to hq.
  let thumbnail = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const head = await httpText(thumbnail, 5000).catch(() => null);
  if (head === null) thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return {
    videoId: id,
    title: title || 'Untitled video',
    author: author || '',
    description: description.trim(),
    transcript: transcript.trim(),
    thumbnail,
    publishDate,
  };
}

/**
 * Shape a YouTube video into the FeedItem + FeedSource the generator expects.
 * The description field carries the video's own description and transcript so
 * the writer is grounded strictly in the video's actual content.
 */
export async function youTubeToSourceItem(
  url: string,
  category: NewsCategory,
): Promise<{ item: FeedItem; source: FeedSource; content: YouTubeContent }> {
  const id = parseYouTubeId(url);
  if (!id) throw new Error('That does not look like a YouTube link. Paste a full video URL.');

  const content = await fetchYouTubeContent(id);
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;

  const parts: string[] = [];
  if (content.description) parts.push(`VIDEO DESCRIPTION:\n${content.description}`);
  if (content.transcript) parts.push(`VIDEO TRANSCRIPT (auto-captioned, may contain transcription errors):\n${content.transcript}`);
  // Keep the writer's input within a sane token budget; transcripts can be long.
  const description = (parts.join('\n\n') || '(No description or captions were available for this video.)').slice(0, 9000);

  const item: FeedItem = {
    title: content.title,
    link: watchUrl,
    description,
    publishedAt: content.publishDate ? new Date(content.publishDate) : null,
    imageUrl: content.thumbnail,
    imageWidth: null,
  };

  const source: FeedSource = {
    id: `youtube:${id}`,
    name: content.author ? `${content.author} (YouTube)` : 'YouTube',
    url: watchUrl,
    category,
    // Unknown single-video outlet: conservative baseline, per the methodology.
    sciBaseline: { transparency: 1, trackRecord: 1, editorialStandards: 1 },
    enabled: true,
  };

  return { item, source, content };
}
