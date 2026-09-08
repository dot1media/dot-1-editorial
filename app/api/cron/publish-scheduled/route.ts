import { NextResponse } from "next/server";
import { sql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { recomputeReviewState } from "@/lib/reviewState";
import { publishToNews } from "@/lib/publish";
export const runtime = "nodejs";

// Publishes stories whose scheduled time has arrived, through the same gate a
// person faces: only stories that are Ready to Publish go out. Anything else
// stays in place for an editor, and is reported so nothing silently stalls.
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const url = new URL(req.url);
  return req.headers.get("authorization") === `Bearer ${secret}` || req.headers.get("x-cron-secret") === secret || url.searchParams.get("secret") === secret;
}
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  if (!newsConfigured()) return NextResponse.json({ error: "Publishing is not configured." }, { status: 503 });
  await ensureSchema();
  const due = (await sql`SELECT * FROM stories WHERE planned_publish_at IS NOT NULL AND planned_publish_at <= now() AND status NOT IN ('published', 'archived') ORDER BY planned_publish_at ASC LIMIT 20`) as any[];
  const published: string[] = []; const waiting: { id: string; reviewState: string }[] = [];
  for (const story of due) {
    const state = await recomputeReviewState(story.id);
    if (state !== "ready_to_publish") { waiting.push({ id: story.id, reviewState: state }); continue; }
    try {
      const authorLabel = story.final_headline ? story.author_name || "Dot 1 Newsroom" : "Dot 1 Newsroom";
      const { newsStoryId, totalScore } = await publishToNews(story, authorLabel);
      await sql`UPDATE stories SET status = 'published', news_story_id = ${newsStoryId}, published_at = COALESCE(published_at, now()), updated_at = now() WHERE id = ${story.id}`;
      await audit("system@scheduler", "publish.scheduled", "story", story.id, { newsStoryId, totalScore, plannedPublishAt: story.planned_publish_at });
      published.push(story.id);
    } catch (e: any) { waiting.push({ id: story.id, reviewState: "error: " + (e?.message || "publish failed") }); }
  }
  return NextResponse.json({ ok: true, published, waiting });
}
