import { sql, newsSql, newsConfigured } from "@/lib/db";

// Read and manage content that has already been posted to the news site. This reaches the news
// database directly (the same one the portal publishes into), so it covers everything live there,
// including older articles the retired news-app pipeline created that never existed as editorial
// stories. Edits and deletes here act on the live site immediately.

export function assertNews() {
  if (!newsConfigured()) throw new Error("News database is not configured.");
}

export async function listArticles({ q = "", limit = 60, offset = 0 }: { q?: string; limit?: number; offset?: number }) {
  assertNews();
  const like = `%${q}%`;
  return newsSql`
    SELECT id, title, summary, category, author, image, status, date, published_at,
      (biblical_alignment + prophetic_significance + source_credibility + humanities) AS total
    FROM news_stories
    WHERE (${q} = '' OR title ILIKE ${like} OR summary ILIKE ${like})
    ORDER BY COALESCE(published_at, date) DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}`;
}

export async function getArticle(id: string) {
  assertNews();
  const rows = await newsSql`SELECT id, title, summary, content, category, author, image, status, published_at, date FROM news_stories WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function updateArticle(id: string, f: { title: string; summary: string; content: string; category: string; image: string; author: string }) {
  assertNews();
  await newsSql`UPDATE news_stories SET
    title = ${f.title}, summary = ${f.summary}, content = ${f.content},
    category = ${f.category}, image = ${f.image}, author = ${f.author}, updated_at = now()
    WHERE id = ${id}`;
}

export async function deleteArticle(id: string) {
  assertNews();
  await newsSql`DELETE FROM news_stories WHERE id = ${id}`;
  // Keep the editorial side consistent: unlink any story that pointed here and mark it archived.
  try {
    await sql`UPDATE stories SET news_story_id = NULL, status = 'archived', updated_at = now() WHERE news_story_id = ${id}`;
  } catch { /* editorial link cleanup is best-effort */ }
}

export async function listPhotos({ q = "", limit = 60, offset = 0 }: { q?: string; limit?: number; offset?: number }) {
  assertNews();
  const like = `%${q}%`;
  return newsSql`
    SELECT id, image, caption, full_description, location, photographer, category, status, published_at, date
    FROM photos
    WHERE (${q} = '' OR caption ILIKE ${like} OR full_description ILIKE ${like})
    ORDER BY COALESCE(published_at, date) DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}`;
}

export async function deletePhoto(id: string) {
  assertNews();
  await newsSql`DELETE FROM photos WHERE id = ${id}`;
}

export async function listVideos({ q = "", limit = 60, offset = 0 }: { q?: string; limit?: number; offset?: number }) {
  assertNews();
  const like = `%${q}%`;
  return newsSql`
    SELECT id, title, description, thumbnail, video_url, duration, category, status, published_at, date
    FROM videos
    WHERE (${q} = '' OR title ILIKE ${like} OR description ILIKE ${like})
    ORDER BY COALESCE(published_at, date) DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}`;
}

export async function deleteVideo(id: string) {
  assertNews();
  await newsSql`DELETE FROM videos WHERE id = ${id}`;
}
