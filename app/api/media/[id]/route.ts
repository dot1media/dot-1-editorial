import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  const has = (k: string) => k in b;
  const s = (k: string): string => (b[k] == null ? "" : String(b[k]));

  await sql`UPDATE media SET
    title       = CASE WHEN ${has("title")}       THEN ${s("title")}       ELSE title END,
    caption     = CASE WHEN ${has("caption")}     THEN ${s("caption")}     ELSE caption END,
    description = CASE WHEN ${has("description")}  THEN ${s("description")} ELSE description END,
    location    = CASE WHEN ${has("location")}    THEN ${s("location")}    ELSE location END,
    credit      = CASE WHEN ${has("credit")}      THEN ${s("credit")}      ELSE credit END,
    category    = CASE WHEN ${has("category")}    THEN ${s("category")}    ELSE category END,
    duration    = CASE WHEN ${has("duration")}    THEN ${s("duration")}    ELSE duration END,
    thumbnail_url = CASE WHEN ${has("thumbnailUrl")} THEN ${s("thumbnailUrl")} ELSE thumbnail_url END,
    story_id    = CASE WHEN ${has("storyId")}     THEN ${b.storyId || null} ELSE story_id END,
    tags        = CASE WHEN ${has("tags")}        THEN ${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}::jsonb ELSE tags END,
    updated_at = now()
    WHERE id = ${id}`;
  await audit(account.email, "media.edit", "media", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  // We remove the editorial record; the blob object is left in place (cheap, and keeps any
  // already-published news row valid). Blob cleanup can be a later housekeeping job.
  await sql`DELETE FROM media WHERE id = ${id}`;
  await audit(account.email, "media.delete", "media", id);
  return NextResponse.json({ ok: true });
}
