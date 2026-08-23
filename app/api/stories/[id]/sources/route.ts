import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("sources.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  const sid = newId("src");
  await sql`INSERT INTO story_sources (id, story_id, name, organization, title, contact, source_type, attribution, response_status, notes, reliability_notes, added_by, date_contacted)
    VALUES (${sid}, ${id}, ${b.name || ""}, ${b.organization || ""}, ${b.title || ""}, ${b.contact || ""},
      ${b.sourceType || "interview"}, ${b.attribution || "on_record"}, ${b.responseStatus || "pending"},
      ${b.notes || ""}, ${b.reliabilityNotes || ""}, ${account.email}, ${b.dateContacted || null})`;
  await audit(account.email, "source.add", "story", id, { sid });
  return NextResponse.json({ id: sid, ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("sources.manage");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  await params;
  const b = await readJson(request);
  if (!b.id) return NextResponse.json({ error: "Source id required." }, { status: 400 });
  await sql`UPDATE story_sources SET
    name = ${b.name || ""}, organization = ${b.organization || ""}, title = ${b.title || ""},
    contact = ${b.contact || ""}, source_type = ${b.sourceType || "interview"}, attribution = ${b.attribution || "on_record"},
    response_status = ${b.responseStatus || "pending"}, notes = ${b.notes || ""}, reliability_notes = ${b.reliabilityNotes || ""}
    WHERE id = ${b.id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const gate = await requireCapability("sources.manage");
  if ("response" in gate) return gate.response;
  const url = new URL(request.url);
  const sid = url.searchParams.get("sid");
  if (!sid) return NextResponse.json({ error: "sid required." }, { status: 400 });
  await sql`DELETE FROM story_sources WHERE id = ${sid}`;
  return NextResponse.json({ ok: true });
}
