import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

// Full episode bundle: the episode, its segments in order, and for each story-backed segment a
// snapshot of the linked story (headline, body for the teleprompter, review state, sources for
// lower-thirds). One call powers the whole rundown + teleprompter view.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const { id } = await params;

  const epRows = await sql`SELECT * FROM episodes WHERE id = ${id} LIMIT 1`;
  if (!epRows.length) return NextResponse.json({ error: "Episode not found." }, { status: 404 });

  const segs = await sql`SELECT * FROM segments WHERE episode_id = ${id} ORDER BY position`;

  // Attach a light story snapshot to each story-backed segment.
  const storyIds = Array.from(new Set(segs.map((s: any) => s.story_id).filter(Boolean)));
  let stories: Record<string, any> = {};
  if (storyIds.length) {
    const rows = await sql`SELECT id, working_headline, final_headline, summary, body, review_state, category, location, scores, hero_image, why_publish FROM stories WHERE id = ANY(${storyIds})`;
    for (const r of rows as any[]) stories[r.id] = r;
  }

  return NextResponse.json({ episode: epRows[0], segments: segs, stories });
}

const EDITABLE = ["title", "air_date", "air_time", "notes", "weather_location", "weather_lat", "weather_lng"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const has = (k: string) => k in b;
  const val = (k: string) => (b[k] === undefined ? null : b[k]);

  await sql`UPDATE episodes SET
    title           = CASE WHEN ${has("title")}           THEN ${String(val("title") ?? "")}        ELSE title END,
    air_date        = CASE WHEN ${has("airDate")}         THEN ${val("airDate")}                     ELSE air_date END,
    air_time        = CASE WHEN ${has("airTime")}         THEN ${String(val("airTime") ?? "")}       ELSE air_time END,
    notes           = CASE WHEN ${has("notes")}           THEN ${String(val("notes") ?? "")}         ELSE notes END,
    weather_location= CASE WHEN ${has("weatherLocation")} THEN ${String(val("weatherLocation") ?? "")} ELSE weather_location END,
    weather_lat     = CASE WHEN ${has("weatherLat")}      THEN ${val("weatherLat")}                  ELSE weather_lat END,
    weather_lng     = CASE WHEN ${has("weatherLng")}      THEN ${val("weatherLng")}                  ELSE weather_lng END,
    updated_at = now()
    WHERE id = ${id}`;

  // Status change is its own guarded action (going live / marking aired).
  if (has("status")) {
    const status = String(b.status);
    const airedAt = status === "aired" || status === "live" ? new Date().toISOString() : null;
    await sql`UPDATE episodes SET status = ${status}, aired_at = COALESCE(aired_at, ${airedAt}), updated_at = now() WHERE id = ${id}`;
    await audit(account.email, "episode.status", "episode", id, { status });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  await sql`DELETE FROM episodes WHERE id = ${id}`;
  await audit(account.email, "episode.delete", "episode", id);
  return NextResponse.json({ ok: true });
}
