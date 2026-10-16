import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { sql, newsSql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

// Edit media metadata or attach/detach a story. Editing rides on media.upload (whoever can add
// media can describe it). story_id may be set to a story id, or null to detach.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const has = (k: string) => k in b;
  const s = (k: string): string => (b[k] == null ? "" : String(b[k]));
  const storyVal = has("storyId") ? (b.storyId || null) : null;

  await sql`UPDATE media_assets SET
    title       = CASE WHEN ${has("title")}       THEN ${s("title")}       ELSE title END,
    caption     = CASE WHEN ${has("caption")}     THEN ${s("caption")}     ELSE caption END,
    description = CASE WHEN ${has("description")} THEN ${s("description")} ELSE description END,
    credit      = CASE WHEN ${has("credit")}      THEN ${s("credit")}      ELSE credit END,
    location    = CASE WHEN ${has("location")}    THEN ${s("location")}    ELSE location END,
    category    = CASE WHEN ${has("category")}    THEN ${s("category")}    ELSE category END,
    media_style = CASE WHEN ${has("mediaStyle")}  THEN ${s("mediaStyle")}  ELSE media_style END,
    story_id    = CASE WHEN ${has("storyId")}     THEN ${storyVal}         ELSE story_id END,
    thumb_url   = CASE WHEN ${has("thumbUrl")}    THEN ${s("thumbUrl")}    ELSE thumb_url END,
    updated_at = now()
    WHERE id = ${id}`;
  await audit(account.email, "media.edit", "media", id, { fields: Object.keys(b) });
  return NextResponse.json({ ok: true });
}

// Delete a media asset. Requires media.upload. If it was published, it is also taken off the live
// news site (otherwise the site keeps listing it with a dead file). Then the Blob files are removed.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const rows = await sql`SELECT kind, blob_url, thumb_url, news_id FROM media_assets WHERE id = ${id} LIMIT 1`;
  const m = rows[0] as any;
  if (!m) return NextResponse.json({ ok: true });

  // 1) Remove the live copy first, so the site never points at a file that is gone.
  if (m.news_id) {
    if (!newsConfigured()) {
      return NextResponse.json({ error: "This item is live on the news site, and the news database is not connected, so it can't be removed there. Nothing was deleted." }, { status: 503 });
    }
    if (m.kind === "image") await newsSql!`DELETE FROM photos WHERE id = ${m.news_id}`;
    else await newsSql!`DELETE FROM videos WHERE id = ${m.news_id}`;
  }

  // 2) Remove the stored files (best effort), then the newsroom record.
  for (const u of new Set([m.blob_url, m.thumb_url])) {
    if (u && /blob\.vercel-storage\.com/.test(u)) { try { await del(u); } catch { /* best effort */ } }
  }
  await sql`DELETE FROM media_assets WHERE id = ${id}`;
  await audit(account.email, "media.delete", "media", id, { newsId: m.news_id || null });
  return NextResponse.json({ ok: true, removedFromSite: !!m.news_id });
}
