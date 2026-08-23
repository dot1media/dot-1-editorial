import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

// Edit a segment: title, duration, teleprompter script, lower-third fields, story link, notes.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const has = (k: string) => k in b;
  const s = (k: string) => (b[k] == null ? "" : String(b[k]));
  const storyVal = has("storyId") ? (b.storyId || null) : null;

  await sql`UPDATE segments SET
    title            = CASE WHEN ${has("title")}          THEN ${s("title")}           ELSE title END,
    type             = CASE WHEN ${has("type")}           THEN ${s("type")}            ELSE type END,
    est_seconds      = CASE WHEN ${has("estSeconds")}     THEN ${Number(b.estSeconds) || 0} ELSE est_seconds END,
    script           = CASE WHEN ${has("script")}         THEN ${s("script")}          ELSE script END,
    lower_third_name = CASE WHEN ${has("lowerThirdName")} THEN ${s("lowerThirdName")}   ELSE lower_third_name END,
    lower_third_title= CASE WHEN ${has("lowerThirdTitle")}THEN ${s("lowerThirdTitle")}  ELSE lower_third_title END,
    presenter_email  = CASE WHEN ${has("presenterEmail")} THEN ${s("presenterEmail")}   ELSE presenter_email END,
    notes            = CASE WHEN ${has("notes")}          THEN ${s("notes")}           ELSE notes END,
    story_id         = CASE WHEN ${has("storyId")}        THEN ${storyVal}             ELSE story_id END,
    updated_at = now()
    WHERE id = ${id}`;
  await audit(account.email, "segment.edit", "segment", id, { fields: Object.keys(b) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  await sql`DELETE FROM segments WHERE id = ${id}`;
  await audit(account.email, "segment.delete", "segment", id);
  return NextResponse.json({ ok: true });
}
