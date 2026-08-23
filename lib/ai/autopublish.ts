import { sql } from "@/lib/db";
import { newsConfigured } from "@/lib/db";
import { audit } from "@/lib/schema";
import { publishToNews } from "@/lib/publish";
import { reconcile, type Rating } from "@/lib/ai/rate";

// Auto-publish gate. A story publishes to news on its own only when BOTH are true:
//   1. it has cleared the newsroom review ladder (review_state = ready_to_publish), and
//   2. its dual-rate is complete (two close raters, or a third has resolved a divergence).
// Only stories marked auto_publish (AI drafts opt in) are eligible; human stories still publish by
// hand. Safe to call from any path that changes review state or ratings; it no-ops unless the gate
// is satisfied and the story is not already published.
export async function maybeAutoPublish(storyId: string): Promise<{ published: boolean; reason?: string }> {
  if (!newsConfigured()) return { published: false, reason: "news_not_configured" };

  const rows = await sql`SELECT * FROM stories WHERE id = ${storyId} LIMIT 1`;
  const story: any = rows[0];
  if (!story) return { published: false, reason: "not_found" };
  if (!story.auto_publish) return { published: false, reason: "not_auto" };
  if (story.status === "published" || story.news_story_id) return { published: false, reason: "already_published" };
  if (story.review_state !== "ready_to_publish") return { published: false, reason: "not_ready" };

  const ratingRows = await sql`SELECT rater_kind, rater_id, rater_name, scores FROM story_ratings WHERE story_id = ${storyId} ORDER BY created_at`;
  const ratings: Rating[] = ratingRows.map((r: any) => ({ rater_kind: r.rater_kind, rater_id: r.rater_id, rater_name: r.rater_name, indicators: r.scores }));
  const rec = reconcile(ratings);
  if (!rec.complete) return { published: false, reason: "dual_rate_incomplete" };

  // Persist the reconciled score, then publish.
  const scoreObj = { indicators: rec.indicators, totals: rec.totals, confidence: story.score_confidence || "moderate", method: rec.method };
  await sql`UPDATE stories SET scores = ${JSON.stringify(scoreObj)}::jsonb WHERE id = ${storyId}`;

  const fresh = await sql`SELECT * FROM stories WHERE id = ${storyId} LIMIT 1`;
  const { newsStoryId } = await publishToNews(fresh[0] as any, fresh[0].source_name || "Dot 1 News", { dualRated: true });
  await sql`UPDATE stories SET status = 'published', news_story_id = ${newsStoryId}, published_at = COALESCE(published_at, now()), updated_at = now() WHERE id = ${storyId}`;
  await audit("ai-desk", "ai.autopublish", "story", storyId, { newsStoryId, method: rec.method });
  return { published: true };
}
