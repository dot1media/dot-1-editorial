import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

// GET is intentionally unauthenticated: the OBS overlay output runs as an anonymous browser source
// and must read the current graphic to put it on air. It returns only lower-third text, which is
// not sensitive, and same-origin so no CORS is needed. Cache is disabled so OBS always sees latest.
export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT seq, state FROM broadcast_bus WHERE id = 'current' LIMIT 1`;
  const seq = rows[0]?.seq ?? 0;
  const state = rows[0]?.state || {};
  const lower = state.lower || { on: false, kicker: "", name: "", title: "" };
  return NextResponse.json({ seq, lower }, { headers: { "Cache-Control": "no-store" } });
}

// POST pushes a prepared lower-third to the bus. Requires broadcast.manage. Body:
//   { lower: { on: boolean, kicker?: string, name?: string, title?: string } }
// The seq is bumped so the overlay detects the change on its next poll.
export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();

  const b = await readJson(request);
  const lo = b.lower || {};
  const lower = {
    on: !!lo.on,
    kicker: String(lo.kicker || "").slice(0, 120),
    name: String(lo.name || "").slice(0, 200),
    title: String(lo.title || "").slice(0, 200),
  };
  const state = { lower };

  const rows = await sql`UPDATE broadcast_bus SET seq = seq + 1, state = ${JSON.stringify(state)}::jsonb,
    updated_by = ${account.email}, updated_at = now() WHERE id = 'current' RETURNING seq`;
  await audit(account.email, "broadcast.bus", "bus", "current", { on: lower.on });
  return NextResponse.json({ ok: true, seq: rows[0]?.seq ?? 0, lower });
}
