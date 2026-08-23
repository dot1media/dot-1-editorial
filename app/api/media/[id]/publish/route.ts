import { NextResponse } from "next/server";
import { sql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { publishMediaToNews } from "@/lib/publish";

export const runtime = "nodejs";

// Publish a media asset into the news database (photos or videos). Requires media.publish. Unlike
// stories, media has no review ladder, but publishing still records who and when in the audit log.
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

  const rows = await sql`SELECT * FROM media_assets WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  const m = rows[0] as any;

  const { newsId } = await publishMediaToNews(m, m.credit || account.name || account.email);
  await sql`UPDATE media_assets SET status = 'published', news_id = ${newsId}, updated_at = now() WHERE id = ${id}`;
  await audit(account.email, "media.publish", "media", id, { kind: m.kind, newsId });
  return NextResponse.json({ ok: true, newsId });
}
