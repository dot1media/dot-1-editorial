import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { ensureRevisions, snapshotIfChanging } from "@/lib/revisions";
export const runtime = "nodejs";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.view"); if ("response" in gate) return gate.response;
  await ensureSchema(); await ensureRevisions();
  const { id } = await params;
  const rev = new URL(req.url).searchParams.get("rev");
  if (rev) { const r = ((await sql`SELECT * FROM story_revisions WHERE id = ${rev} AND story_id = ${id} LIMIT 1`) as any[])[0]; return r ? NextResponse.json({ revision: r }) : NextResponse.json({ error: "Not found." }, { status: 404 }); }
  const rows = (await sql`SELECT id, working_headline, final_headline, saved_by, reason, created_at, length(coalesce(body, '')) AS body_len, length(coalesce(summary, '')) AS summary_len FROM story_revisions WHERE story_id = ${id} ORDER BY created_at DESC`) as any[];
  return NextResponse.json({ revisions: rows });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.edit"); if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema(); await ensureRevisions();
  const { id } = await params;
  const b = await readJson(request);
  const r = ((await sql`SELECT * FROM story_revisions WHERE id = ${String(b.revisionId || "")} AND story_id = ${id} LIMIT 1`) as any[])[0];
  if (!r) return NextResponse.json({ error: "Revision not found." }, { status: 404 });
  await snapshotIfChanging(id, { workingHeadline: r.working_headline, finalHeadline: r.final_headline, summary: r.summary, body: r.body }, account.email, "before restore");
  await sql`UPDATE stories SET working_headline = ${r.working_headline || ""}, final_headline = ${r.final_headline || ""}, summary = ${r.summary || ""}, body = ${r.body || ""}, updated_at = now() WHERE id = ${id}`;
  await audit(account.email, "story.restore", "story", id, { revisionId: r.id, from: r.created_at });
  return NextResponse.json({ ok: true });
}
