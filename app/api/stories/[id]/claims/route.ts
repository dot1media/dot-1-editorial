import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";
import { recomputeReviewState } from "@/lib/reviewState";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("verification.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  const claim = String(b.claim || "").trim();
  if (!claim) return NextResponse.json({ error: "Claim text required." }, { status: 400 });
  const cid = newId("clm");
  await sql`INSERT INTO verification_claims (id, story_id, claim, status, sources, notes, updated_by)
    VALUES (${cid}, ${id}, ${claim}, ${b.status || "unconfirmed"}, ${b.sources || ""}, ${b.notes || ""}, ${account.email})`;
  await recomputeReviewState(id);
  await audit(account.email, "claim.add", "story", id, { cid });
  return NextResponse.json({ id: cid, ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("verification.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  if (!b.id) return NextResponse.json({ error: "Claim id required." }, { status: 400 });
  await sql`UPDATE verification_claims SET
    claim = COALESCE(${b.claim ?? null}, claim),
    status = COALESCE(${b.status ?? null}, status),
    sources = COALESCE(${b.sources ?? null}, sources),
    notes = COALESCE(${b.notes ?? null}, notes),
    updated_by = ${account.email}, updated_at = now()
    WHERE id = ${b.id}`;
  await recomputeReviewState(id);
  await audit(account.email, "claim.update", "story", id, { cid: b.id, status: b.status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("verification.manage");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const { id } = await params;
  const url = new URL(request.url);
  const cid = url.searchParams.get("cid");
  if (!cid) return NextResponse.json({ error: "cid required." }, { status: 400 });
  await sql`DELETE FROM verification_claims WHERE id = ${cid}`;
  await recomputeReviewState(id);
  return NextResponse.json({ ok: true });
}
