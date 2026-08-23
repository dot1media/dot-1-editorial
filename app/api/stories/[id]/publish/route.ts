import { NextResponse } from "next/server";
import { sql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { readJson } from "@/lib/api";
import { can } from "@/lib/permissions";
import { recomputeReviewState } from "@/lib/reviewState";
import { publishToNews, unpublishFromNews } from "@/lib/publish";

export const runtime = "nodejs";

// Publish a story to news.dot1.media. This is the guarded bridge between the two databases.
// A story may only publish when its review state is ready_to_publish (complete checklist AND
// editor approval), UNLESS someone with publish.override supplies an explicit reason, which is
// recorded in the audit log. Re-publishing an already-published story updates the same news row.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!can(account.permissions, "publish.toNews")) {
    return NextResponse.json({ error: "You do not have permission to publish." }, { status: 403 });
  }
  if (!newsConfigured()) {
    return NextResponse.json({ error: "Publishing is not configured. NEWS_DATABASE_URL is missing." }, { status: 503 });
  }
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const rows = await sql`SELECT * FROM stories WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  const story = rows[0];

  // Recompute fresh so we never publish on a stale ladder value.
  const state = await recomputeReviewState(id);
  const gated = state !== "ready_to_publish";

  if (gated) {
    const reason = String(b.overrideReason || "").trim();
    if (!can(account.permissions, "publish.override")) {
      return NextResponse.json(
        { error: "This story has not completed editorial review. An editor with override permission must publish it.", reviewState: state },
        { status: 409 }
      );
    }
    if (!reason) {
      return NextResponse.json(
        { error: "This story is not Ready to Publish. Provide an override reason to publish anyway.", reviewState: state, needsOverride: true },
        { status: 409 }
      );
    }
    await audit(account.email, "publish.override", "story", id, { reviewState: state, reason });
  }

  const authorLabel = story.final_headline ? story.author_name || "Dot 1 Newsroom" : "Dot 1 Newsroom";
  const { newsStoryId, totalScore } = await publishToNews(story as any, authorLabel);

  await sql`UPDATE stories SET status = 'published', news_story_id = ${newsStoryId}, published_at = COALESCE(published_at, now()), updated_at = now() WHERE id = ${id}`;
  await audit(account.email, gated ? "publish.forced" : "publish", "story", id, { newsStoryId, totalScore });

  return NextResponse.json({ ok: true, newsStoryId, totalScore, overridden: gated });
}

// Pull a published story back out of the reader feed (archive it in news). Requires publish.toNews.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!can(account.permissions, "publish.toNews")) {
    return NextResponse.json({ error: "You do not have permission." }, { status: 403 });
  }
  await ensureSchema();
  const { id } = await params;
  const rows = await sql`SELECT news_story_id FROM stories WHERE id = ${id} LIMIT 1`;
  const newsId = rows[0]?.news_story_id;
  if (newsId) await unpublishFromNews(newsId);
  await sql`UPDATE stories SET status = 'archived', updated_at = now() WHERE id = ${id}`;
  await audit(account.email, "unpublish", "story", id, { newsId });
  return NextResponse.json({ ok: true });
}
