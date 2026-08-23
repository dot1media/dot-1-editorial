import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { normalizeIndicators, computeIndexTotals, ScoreConfidence } from "@/lib/scoring";

export const runtime = "nodejs";

// Save a D1-4LS score for a story. Indicators are the source of truth; totals are always derived
// server-side (per the methodology and the Handbook). The score is stored on the editorial story
// as JSON and carried to the news database at publish time. Editing scores rides on story.edit.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.edit");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const indicators = normalizeIndicators(b.indicators || {});
  const totals = computeIndexTotals(indicators);
  const confidence: ScoreConfidence =
    b.confidence === "high" || b.confidence === "developing" ? b.confidence : "moderate";
  const notes = String(b.notes || "");

  const scores = { indicators, totals, notes, ratedBy: account.email, ratedAt: new Date().toISOString() };
  await sql`UPDATE stories SET scores = ${JSON.stringify(scores)}, score_confidence = ${confidence}, updated_at = now() WHERE id = ${id}`;
  await audit(account.email, "story.score", "story", id, { total: totals.total, confidence });
  return NextResponse.json({ ok: true, totals });
}
