/**
 * Minimal, dependency-free RSS 2.0 / Atom parser.
 *
 * Deliberately zero-dependency: this runs inside the same Vercel function
 * as the API, and adding a full XML parser to the bundle for the handful
 * of well-formed fields we need (title, link, description, date, image)
 * isn't worth the cold-start cost. Regex-based extraction of top-level
 * item fields is robust for real-world news feeds; anything malformed is
 * simply skipped.
 */

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  publishedAt: Date | null;
  imageUrl: string | null;
  /** Width of the chosen image if the feed declared one; null if unknown. */
  imageWidth: number | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

function stripHtml(s: string): string {
  return decodeEntities(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(block: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = block.match(p);
    if (m && m[1] !== undefined) return m[1].trim();
  }
  return null;
}

function extractItemBlocks(xml: string): string[] {
  const rssItems = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  if (rssItems.length > 0) return rssItems;
  return xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
}

function parseItem(block: string): FeedItem | null {
  const rawTitle = firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
  if (!rawTitle) return null;
  const title = stripHtml(rawTitle);
  if (!title) return null;

  // RSS uses <link>url</link>; Atom uses <link href="url"/>
  let link = firstMatch(block, [/<link[^>]*>([\s\S]*?)<\/link>/i]);
  if (!link || !link.startsWith('http')) {
    link = firstMatch(block, [/<link[^>]*href="([^"]+)"[^>]*\/?>(?:<\/link>)?/i]) || link;
  }
  if (!link || !/^https?:\/\//i.test(link)) return null;

  const rawDesc = firstMatch(block, [
    /<description[^>]*>([\s\S]*?)<\/description>/i,
    /<summary[^>]*>([\s\S]*?)<\/summary>/i,
    /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i,
  ]) || '';
  const description = stripHtml(rawDesc).slice(0, 1200);

  const rawDate = firstMatch(block, [
    /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i,
    /<published[^>]*>([\s\S]*?)<\/published>/i,
    /<updated[^>]*>([\s\S]*?)<\/updated>/i,
    /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i,
  ]);
  let publishedAt: Date | null = null;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) publishedAt = d;
  }

  const imageUrl = firstMatch(block, [
    /<media:content[^>]*url="([^"]+)"/i,
    /<media:thumbnail[^>]*url="([^"]+)"/i,
    /<enclosure[^>]*url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*>/i,
    /<img[^>]*src="([^"]+)"/i,
  ]);
  const best = pickBestImage(block);

  return {
    title: decodeEntities(title),
    link: decodeEntities(link),
    description,
    publishedAt,
    imageUrl: best.url ?? (imageUrl && /^https?:\/\//i.test(imageUrl) ? decodeEntities(imageUrl) : null),
    imageWidth: best.url ? best.width : null,
  };
}


/**
 * Feeds often list SEVERAL images per item — e.g. a 240px media:thumbnail
 * next to 976px media:content variants. Taking the first match shipped
 * tiny images app-wide. This collects every candidate with any declared
 * width and returns the widest, preferring media:content over enclosure
 * over thumbnail when widths are undeclared.
 */
function pickBestImage(block: string): { url: string | null; width: number | null } {
  const candidates: { url: string; width: number | null; rank: number }[] = [];
  const collect = (tagRe: RegExp, rank: number) => {
    for (const m of block.matchAll(tagRe)) {
      const tag = m[0];
      const url = tag.match(/url="([^"]+)"/i)?.[1] || tag.match(/src="([^"]+)"/i)?.[1];
      if (!url || !/^https?:\/\//i.test(url)) continue;
      const w = tag.match(/width="(\d+)"/i)?.[1];
      candidates.push({ url, width: w ? parseInt(w, 10) : null, rank });
    }
  };
  collect(/<media:content[^>]*>/gi, 3);
  collect(/<enclosure[^>]*type="image[^"]*"[^>]*>/gi, 2);
  collect(/<media:thumbnail[^>]*>/gi, 1);
  if (candidates.length === 0) return { url: null, width: null };
  candidates.sort((a, b) => (b.width ?? -1) - (a.width ?? -1) || b.rank - a.rank);
  const top = candidates[0];
  return { url: decodeEntities(top.url), width: top.width };
}

/** Fetch and parse a feed. Returns [] on any failure (logged, never thrown). */
/** Parse raw RSS/Atom XML into feed items. Exported for testability. */
export function parseFeedBody(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const block of extractItemBlocks(xml)) {
    const item = parseItem(block);
    if (item) items.push(item);
  }
  return items;
}

export async function fetchFeed(url: string, timeoutMs = 12000): Promise<FeedItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Dot1News-ContentPipeline/1.0 (+https://dot1.media)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`📡 Feed ${url} responded ${res.status} — skipping`);
      return [];
    }

    const xml = await res.text();
    return parseFeedBody(xml);
  } catch (e: any) {
    console.warn(`📡 Feed ${url} failed (${e.message}) — skipping`);
    return [];
  }
}

/**
 * Fetch an article page and extract its og:image (the outlet's own social
 * card image) — used when the RSS entry carries no media. Bounded and
 * best-effort: any failure just returns null.
 */
export async function fetchOgImage(pageUrl: string, timeoutMs = 4000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Dot1News-ContentPipeline/1.0 (+https://dot1.media)',
        'Accept': 'text/html',
      },
    });
    if (!res.ok) return null;
    // Only the head matters; cap the read defensively.
    const html = (await res.text()).slice(0, 200000);
    const m =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    const url = m?.[1]?.trim();
    return url && /^https?:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
