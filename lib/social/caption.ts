/**
 * Caption writer for Dot 1 News social posts. Measured, calm brand voice, no
 * em-dashes, with a clear source line and the handle. Facebook gets the inline
 * article link; Instagram points to the link in bio. Captions are a starting
 * draft that an editor reviews and can edit before anything posts.
 */

const NEWS_BASE = process.env.NEWS_PUBLIC_BASE || "https://news.dot1.media";

export interface CaptionStory {
  newsStoryId: string;
  title: string;
  summary?: string | null;
  category?: string | null;
}

export interface Captions {
  instagram: string;
  facebook: string;
  x: string;
}

/** Enforce the house dash rule and tidy whitespace. No em or en dashes in prose. */
function clean(s: string): string {
  return (s || "")
    .replace(/\s*—\s*/g, ", ") // em dash to comma
    .replace(/\s*–\s*/g, " to ") // en dash to "to"
    .replace(/\s+/g, " ")
    .trim();
}

function articleUrl(id: string): string {
  return `${NEWS_BASE}/s/n/${encodeURIComponent(id)}`;
}

/** A short, stable hashtag set. Category-derived plus brand tags, nothing invented. */
function hashtags(category?: string | null): string {
  const base = ["Dot1News", "Alaska", "AlaskaNews"];
  const cat = (category || "").replace(/[^a-zA-Z0-9]/g, "");
  const tags = cat ? [cat, ...base] : base;
  // de-dupe case-insensitively, keep order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const k = t.toLowerCase();
    if (t && !seen.has(k)) { seen.add(k); out.push(`#${t}`); }
  }
  return out.join(" ");
}

/** Build the lead paragraph: the summary if we have one, else the headline. */
function lead(story: CaptionStory): string {
  const summary = clean(story.summary || "");
  if (summary.length >= 40) return summary;
  return clean(story.title);
}

export function buildCaptions(story: CaptionStory): Captions {
  const body = lead(story);
  const tags = hashtags(story.category);
  const url = articleUrl(story.newsStoryId);
  const brand = "A declared standpoint, not a hidden one.";

  const instagram = [
    body,
    "",
    "Read the full story at news.dot1.media. Link in bio.",
    "",
    brand,
    "",
    tags,
  ].join("\n");

  const facebook = [
    body,
    "",
    `Read the full story: ${url}`,
    "",
    brand,
    "",
    tags,
  ].join("\n");

  // X caps posts at 280 characters, and any URL counts as 23 (t.co wrapping),
  // so budget the lead against a fixed reserve for the link and a short tag set.
  const xTags = "#Dot1News #Alaska";
  const URL_WEIGHT = 23;
  const reserve = URL_WEIGHT + xTags.length + 4; // link + tags + the newlines joining them
  let xBody = body;
  if (xBody.length > 280 - reserve) xBody = xBody.slice(0, 280 - reserve - 1).trimEnd() + "…";
  const x = `${xBody}\n${url}\n${xTags}`;

  return { instagram, facebook, x };
}
