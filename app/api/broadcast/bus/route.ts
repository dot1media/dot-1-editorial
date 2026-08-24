import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

// The broadcast bus: one live channel the rundown/graphics control writes and the OBS overlay
// output reads (OBS runs an isolated browser that can't share localStorage). It carries the
// on-air graphics: lower third, logo bug, ticker, and breaking banner. Each element is updated
// independently (POST merges), so pushing the ticker never disturbs a lower third already up.

const EMPTY = {
  lower: { on: false, kicker: "", name: "", title: "" },
  bug: { on: false, color: "white", live: false },
  ticker: { on: false, headlines: "", label: "Latest" },
  breaking: { on: false, text: "" },
};

// GET is unauthenticated: the overlay output is an anonymous browser source and only reads graphic
// text, which isn't sensitive. Same-origin, no-store so OBS always sees the latest.
export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT seq, state FROM broadcast_bus WHERE id = 'current' LIMIT 1`;
  const seq = rows[0]?.seq ?? 0;
  const state = { ...EMPTY, ...(rows[0]?.state || {}) };
  return NextResponse.json({ seq, ...state }, { headers: { "Cache-Control": "no-store" } });
}

// POST merges the provided element(s) into the current state and bumps seq. Requires broadcast.manage.
// Body may include any of: lower, bug, ticker, breaking (each an object). Unspecified elements are
// left as they were.
export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();

  const rows = await sql`SELECT state FROM broadcast_bus WHERE id = 'current' LIMIT 1`;
  const current = { ...EMPTY, ...(rows[0]?.state || {}) };
  const b = await readJson(request);

  const clampStr = (v: any, n: number) => String(v ?? "").slice(0, n);
  const next: any = { ...current };
  if (b.lower) next.lower = { on: !!b.lower.on, kicker: clampStr(b.lower.kicker, 120), name: clampStr(b.lower.name, 200), title: clampStr(b.lower.title, 200) };
  if (b.bug) next.bug = { on: !!b.bug.on, color: ["white", "red", "black"].includes(b.bug.color) ? b.bug.color : current.bug.color, live: !!b.bug.live };
  if (b.ticker) next.ticker = { on: !!b.ticker.on, headlines: clampStr(b.ticker.headlines, 1000), label: clampStr(b.ticker.label, 40) || "Latest" };
  if (b.breaking) next.breaking = { on: !!b.breaking.on, text: clampStr(b.breaking.text, 200) };

  const upd = await sql`UPDATE broadcast_bus SET seq = seq + 1, state = ${JSON.stringify(next)}::jsonb,
    updated_by = ${account.email}, updated_at = now() WHERE id = 'current' RETURNING seq`;
  const changed = ["lower", "bug", "ticker", "breaking"].filter((k) => (b as any)[k]);
  await audit(account.email, "broadcast.bus", "bus", "current", { changed });
  return NextResponse.json({ ok: true, seq: upd[0]?.seq ?? 0, ...next });
}
