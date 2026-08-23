import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";
import { normalizeIndicators } from "@/lib/scoring";
import { reconcile, type Rating } from "@/lib/ai/rate";
import { maybeAutoPublish } from "@/lib/ai/autopublish";

export const runtime = "nodejs";

// GET: the ratings on a story plus the current reconciliation (who rated, how they differ, whether
// a third is needed). Powers the dual-rate panel.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const { id } = await params;
  const rows = await sql`SELECT id, rater_kind, rater_id, rater_name, scores, notes, created_at FROM story_ratings WHERE story_id = ${id} ORDER BY created_at`;
  const ratings: Rating[] = rows.map((r: any) => ({ rater_kind: r.rater_kind, rater_id: r.rater_id, rater_name: r.rater_name, indicators: r.scores }));
  return NextResponse.json({ ratings: rows, reconciliation: reconcile(ratings) });
}

// POST: submit a human rating (the second, or a tie-breaking third). Gated on review.complete.
// A rater cannot rate the same story twice. After recording, the reconciled score is written back
// to the story and auto-publish is attempted (fires only if the story has also cleared review).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("review.complete");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const existing = await sql`SELECT 1 FROM story_ratings WHERE story_id = ${id} AND rater_id = ${account.email} LIMIT 1`;
  if (existing.length) return NextResponse.json({ error: "You have already rated this story." }, { status: 400 });

  const indicators = normalizeIndicators(b.indicators || {});
  await sql`INSERT INTO story_ratings (id, story_id, rater_kind, rater_id, rater_name, scores, notes)
    VALUES (${newId("rate")}, ${id}, ${"human"}, ${account.email}, ${account.name || account.email}, ${JSON.stringify(indicators)}::jsonb, ${String(b.notes || "")})`;

  const rows = await sql`SELECT rater_kind, rater_id, rater_name, scores FROM story_ratings WHERE story_id = ${id} ORDER BY created_at`;
  const ratings: Rating[] = rows.map((r: any) => ({ rater_kind: r.rater_kind, rater_id: r.rater_id, rater_name: r.rater_name, indicators: r.scores }));
  const rec = reconcile(ratings);

  // Write the reconciled (or provisional) score back so the score tab and cards stay in sync.
  const scoreObj = { indicators: rec.indicators, totals: rec.totals, confidence: rec.complete ? "high" : "developing", method: rec.method };
  await sql`UPDATE stories SET scores = ${JSON.stringify(scoreObj)}::jsonb, score_confidence = ${rec.complete ? "high" : "developing"}, updated_at = now() WHERE id = ${id}`;
  await audit(account.email, "story.rate", "story", id, { method: rec.method, complete: rec.complete });

  const auto = await maybeAutoPublish(id);
  return NextResponse.json({ ok: true, reconciliation: rec, autoPublished: auto.published });
}
