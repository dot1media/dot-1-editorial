import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
export const runtime = "nodejs";
async function ensure() { await sql`CREATE TABLE IF NOT EXISTS story_discussion (id TEXT PRIMARY KEY, story_id TEXT NOT NULL, author_email TEXT NOT NULL, author_name TEXT DEFAULT '', body TEXT NOT NULL, resolved BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now())`; await sql`CREATE INDEX IF NOT EXISTS story_discussion_sid ON story_discussion (story_id, created_at)`; }
// Internal discussion on a story: separate from the reporting log (evidence trail) and corrections (public record).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.view"); if ("response" in gate) return gate.response;
  await ensureSchema(); await ensure();
  const { id } = await params;
  const rows = await sql`SELECT * FROM story_discussion WHERE story_id = ${id} ORDER BY created_at ASC`;
  return NextResponse.json({ discussion: rows });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.view"); if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema(); await ensure();
  const { id } = await params;
  const b = await readJson(request);
  const body = String(b.body || "").trim().slice(0, 4000);
  if (!body) return NextResponse.json({ error: "Write something first." }, { status: 400 });
  const cid = "dc_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  await sql`INSERT INTO story_discussion (id, story_id, author_email, author_name, body) VALUES (${cid}, ${id}, ${account.email}, ${account.name || ""}, ${body})`;
  await audit(account.email, "discussion.add", "story", id, { commentId: cid });
  return NextResponse.json({ ok: true, id: cid });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.view"); if ("response" in gate) return gate.response;
  await ensureSchema(); await ensure();
  const { id } = await params;
  const b = await readJson(request);
  const cid = String(b.id || ""); if (!cid) return NextResponse.json({ error: "Missing comment." }, { status: 400 });
  await sql`UPDATE story_discussion SET resolved = ${!!b.resolved} WHERE id = ${cid} AND story_id = ${id}`;
  return NextResponse.json({ ok: true });
}
