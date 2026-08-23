import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";
import { segMeta } from "@/lib/broadcast";

export const runtime = "nodejs";

// Add a segment to the end of an episode's rundown. If a story is linked and no title/duration is
// given, inherit sensible defaults from the story and segment type.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const meta = segMeta(b.type || "package");
  const posRows = await sql`SELECT COALESCE(MAX(position), -1) + 1 AS next FROM segments WHERE episode_id = ${id}`;
  const position = posRows[0]?.next || 0;

  let title = String(b.title || "").trim();
  let script = String(b.script || "");
  let ln = "", lt = "";

  if (b.storyId) {
    const s = await sql`SELECT working_headline, final_headline, body, reporter_email FROM stories WHERE id = ${b.storyId} LIMIT 1`;
    if (s.length) {
      if (!title) title = s[0].final_headline || s[0].working_headline;
      if (!script) script = s[0].body || "";
    }
  }
  if (!title) title = meta.label;

  const segId = newId("seg");
  await sql`INSERT INTO segments (id, episode_id, position, type, title, story_id, est_seconds, script, lower_third_name, lower_third_title)
    VALUES (${segId}, ${id}, ${position}, ${b.type || "package"}, ${title}, ${b.storyId || null},
      ${b.estSeconds || meta.defaultSeconds}, ${script}, ${ln}, ${lt})`;
  await audit(account.email, "segment.add", "episode", id, { segId, type: b.type });
  return NextResponse.json({ id: segId, ok: true });
}

// Reorder: accepts an array of segment ids in the new order.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  if (!Array.isArray(b.order)) return NextResponse.json({ error: "order array required." }, { status: 400 });

  let pos = 0;
  for (const segId of b.order) {
    await sql`UPDATE segments SET position = ${pos}, updated_at = now() WHERE id = ${segId} AND episode_id = ${id}`;
    pos += 1;
  }
  await audit(account.email, "segment.reorder", "episode", id);
  return NextResponse.json({ ok: true });
}
