import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("evidence.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  const eid = newId("ev");
  await sql`INSERT INTO story_evidence (id, story_id, kind, label, url, notes, added_by)
    VALUES (${eid}, ${id}, ${b.kind || "document"}, ${b.label || ""}, ${b.url || ""}, ${b.notes || ""}, ${account.email})`;
  await audit(account.email, "evidence.add", "story", id, { eid, kind: b.kind });
  return NextResponse.json({ id: eid, ok: true });
}

export async function DELETE(request: Request) {
  const gate = await requireCapability("evidence.manage");
  if ("response" in gate) return gate.response;
  const url = new URL(request.url);
  const eid = url.searchParams.get("eid");
  if (!eid) return NextResponse.json({ error: "eid required." }, { status: 400 });
  await sql`DELETE FROM story_evidence WHERE id = ${eid}`;
  return NextResponse.json({ ok: true });
}
