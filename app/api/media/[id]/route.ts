import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
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
    updated_at = now()
    WHERE id = ${id}`;
  await audit(account.email, "media.edit", "media", id, { fields: Object.keys(b) });
  return NextResponse.json({ ok: true });
}

// Delete a media asset. Requires media.upload. Removes the Blob file too, best-effort.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const rows = await sql`SELECT blob_url FROM media_assets WHERE id = ${id} LIMIT 1`;
  const blobUrl = rows[0]?.blob_url;
  if (blobUrl) { try { await del(blobUrl); } catch { /* best effort */ } }
  await sql`DELETE FROM media_assets WHERE id = ${id}`;
  await audit(account.email, "media.delete", "media", id);
  return NextResponse.json({ ok: true });
}
