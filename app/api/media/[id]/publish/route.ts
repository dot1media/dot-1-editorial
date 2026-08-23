import { NextResponse } from "next/server";
import { sql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { publishMediaToNews } from "@/lib/publish";

export const runtime = "nodejs";

// Publish a standalone photo or video into the news database. Requires media.publish. Re-publishing
// updates the same news row. The credit (photographer/producer) falls back to the newsroom name.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!can(account.permissions, "media.publish")) {
    return NextResponse.json({ error: "You do not have permission to publish media." }, { status: 403 });
  }
  if (!newsConfigured()) {
    return NextResponse.json({ error: "Publishing is not configured. NEWS_DATABASE_URL is missing." }, { status: 503 });
  }
  await ensureSchema();
  const { id } = await params;
  const rows = await sql`SELECT * FROM media WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  const m = rows[0] as any;

  const credit = m.credit || account.name || "Dot 1 Newsroom";
  const newsId = await publishMediaToNews(m, credit);
  await sql`UPDATE media SET status = 'published', news_media_id = ${newsId}, updated_at = now() WHERE id = ${id}`;
  await audit(account.email, "media.publish", "media", id, { newsId, kind: m.kind });
  return NextResponse.json({ ok: true, newsId });
}
