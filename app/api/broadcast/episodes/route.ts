import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";
import { segMeta } from "@/lib/broadcast";

export const runtime = "nodejs";

// List episodes, newest air date first, with a segment count and summed runtime for the list view.
export async function GET() {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const rows = await sql`
    SELECT e.*,
      COALESCE(s.cnt, 0) AS segment_count,
      COALESCE(s.secs, 0) AS runtime_seconds
    FROM episodes e
    LEFT JOIN (SELECT episode_id, COUNT(*)::int AS cnt, SUM(est_seconds)::int AS secs FROM segments GROUP BY episode_id) s
      ON s.episode_id = e.id
    ORDER BY e.air_date DESC NULLS LAST, e.created_at DESC LIMIT 200`;
  return NextResponse.json({ episodes: rows });
}

// Create an episode. If templateId is given, copy its segment skeleton into real segment rows and
// inherit its weather location. Otherwise start blank (ad hoc). airDate/airTime optional (schedule).
export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const b = await readJson(request);

  const title = String(b.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title required." }, { status: 400 });

  let weatherLocation = b.weatherLocation || "";
  let weatherLat = b.weatherLat ?? null;
  let weatherLng = b.weatherLng ?? null;
  let skeleton: any[] = [];

  if (b.templateId) {
    const t = await sql`SELECT * FROM show_templates WHERE id = ${b.templateId} LIMIT 1`;
    if (t.length) {
      skeleton = Array.isArray(t[0].segments) ? t[0].segments : [];
      if (!weatherLocation) { weatherLocation = t[0].weather_location || ""; weatherLat = t[0].weather_lat; weatherLng = t[0].weather_lng; }
    }
  }

  const id = newId("ep");
  await sql`INSERT INTO episodes (id, template_id, title, air_date, air_time, status, weather_location, weather_lat, weather_lng, created_by)
    VALUES (${id}, ${b.templateId || null}, ${title}, ${b.airDate || null}, ${b.airTime || ""}, 'planning',
      ${weatherLocation}, ${weatherLat}, ${weatherLng}, ${account.email})`;

  // Materialize template segments into real rows.
  let pos = 0;
  for (const seg of skeleton) {
    const meta = segMeta(seg.type);
    await sql`INSERT INTO segments (id, episode_id, position, type, title, est_seconds)
      VALUES (${newId("seg")}, ${id}, ${pos}, ${seg.type || "package"}, ${seg.title || meta.label}, ${seg.est_seconds || meta.defaultSeconds})`;
    pos += 1;
  }

  await audit(account.email, "episode.create", "episode", id, { title, fromTemplate: b.templateId || null });
  return NextResponse.json({ id, ok: true });
}
