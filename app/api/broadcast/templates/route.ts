import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";
import { DEFAULT_TEMPLATE_SEGMENTS } from "@/lib/broadcast";

export const runtime = "nodejs";

// List templates. Seeds one default recurring show on first load so the feature is usable at once.
export async function GET() {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();

  const existing = await sql`SELECT COUNT(*)::int AS n FROM show_templates`;
  if ((existing[0]?.n || 0) === 0) {
    await sql`INSERT INTO show_templates (id, name, description, default_weekday, default_time, target_runtime_seconds, segments, weather_location, weather_lat, weather_lng, created_by)
      VALUES (${newId("tpl")}, ${"Evening Edition"}, ${"The nightly Dot 1 News broadcast."}, ${4}, ${"18:00"}, ${1800},
        ${JSON.stringify(DEFAULT_TEMPLATE_SEGMENTS)}, ${"Wasilla, AK"}, ${61.5814}, ${-149.4394}, ${"system"})`;
  }
  const rows = await sql`SELECT * FROM show_templates ORDER BY name`;
  return NextResponse.json({ templates: rows });
}

export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const b = await readJson(request);
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });
  const id = newId("tpl");
  await sql`INSERT INTO show_templates (id, name, description, default_weekday, default_time, target_runtime_seconds, segments, weather_location, weather_lat, weather_lng, created_by)
    VALUES (${id}, ${name}, ${b.description || ""}, ${b.defaultWeekday ?? null}, ${b.defaultTime || ""}, ${b.targetRuntimeSeconds || 0},
      ${JSON.stringify(b.segments || DEFAULT_TEMPLATE_SEGMENTS)}, ${b.weatherLocation || ""}, ${b.weatherLat ?? null}, ${b.weatherLng ?? null}, ${account.email})`;
  await audit(account.email, "template.create", "template", id, { name });
  return NextResponse.json({ id, ok: true });
}
