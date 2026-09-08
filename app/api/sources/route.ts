import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
export const runtime = "nodejs";
// Cross-story source registry: reliability and notes keyed by normalized name (+ organization).
const norm = (s: string) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
async function ensure() { await sql`CREATE TABLE IF NOT EXISTS source_registry (key TEXT PRIMARY KEY, name TEXT NOT NULL, organization TEXT DEFAULT '', reliability INT, notes TEXT DEFAULT '', updated_by TEXT DEFAULT '', updated_at TIMESTAMPTZ DEFAULT now())`; }
export const sourceKey = (name: string, org: string) => norm(name) + "|" + norm(org);
export async function GET() {
  const gate = await requireCapability("story.view"); if ("response" in gate) return gate.response;
  await ensureSchema(); await ensure();
  const used = (await sql`SELECT name, organization, source_type, attribution, story_id FROM story_sources WHERE name <> ''`) as any[];
  const reg = (await sql`SELECT * FROM source_registry`) as any[];
  const byKey: Record<string, any> = {};
  for (const u of used) { const k = sourceKey(u.name, u.organization); const e = (byKey[k] ||= { key: k, name: u.name, organization: u.organization || "", stories: new Set<string>(), types: new Set<string>(), offRecord: 0 }); e.stories.add(u.story_id); e.types.add(u.source_type); if (u.attribution && u.attribution !== "on_record") e.offRecord++; }
  for (const r of reg) { const e = (byKey[r.key] ||= { key: r.key, name: r.name, organization: r.organization || "", stories: new Set<string>(), types: new Set<string>(), offRecord: 0 }); e.reliability = r.reliability; e.notes = r.notes; e.updatedBy = r.updated_by; e.updatedAt = r.updated_at; }
  const sources = Object.values(byKey).map((e: any) => ({ key: e.key, name: e.name, organization: e.organization, storyCount: e.stories.size, types: Array.from(e.types), offRecord: e.offRecord, reliability: e.reliability ?? null, notes: e.notes || "", updatedBy: e.updatedBy || "", updatedAt: e.updatedAt || null })).sort((a: any, b: any) => b.storyCount - a.storyCount || a.name.localeCompare(b.name));
  return NextResponse.json({ sources });
}
export async function POST(request: Request) {
  const gate = await requireCapability("story.edit"); if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema(); await ensure();
  const b = await readJson(request);
  const name = String(b.name || "").trim(), org = String(b.organization || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const rel = b.reliability == null || b.reliability === "" ? null : Math.max(1, Math.min(5, parseInt(String(b.reliability), 10) || 0)) || null;
  const notes = String(b.notes || "").slice(0, 2000);
  const key = sourceKey(name, org);
  await sql`INSERT INTO source_registry (key, name, organization, reliability, notes, updated_by, updated_at) VALUES (${key}, ${name}, ${org}, ${rel}, ${notes}, ${account.email}, now()) ON CONFLICT (key) DO UPDATE SET reliability = ${rel}, notes = ${notes}, updated_by = ${account.email}, updated_at = now()`;
  await audit(account.email, "source.rate", "source", key, { reliability: rel });
  return NextResponse.json({ ok: true, key, reliability: rel });
}
