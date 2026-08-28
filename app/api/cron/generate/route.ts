import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { runGeneration } from "@/lib/ai/run";

export const runtime = "nodejs";
export const maxDuration = 300;

// Scheduled generation for the AI desk. Vercel Cron calls this on a schedule (see vercel.json).
//
// Three safeguards, so it can be deployed before we cut over:
//   1. KILL SWITCH — does nothing unless AI_PIPELINE_ENABLED === 'true'. Deploy dormant, flip on
//      after the manual path is proven end to end.
//   2. SECRET — Vercel Cron sends Authorization: Bearer $CRON_SECRET; we also accept ?secret= or
//      x-cron-secret for manual testing. If CRON_SECRET is set, a caller must match it.
//   3. DAILY CAP — never generate more than PIPELINE_DAILY_CAP AI drafts per day (default 5).
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return NextResponse.json({ error: "Cron is not configured (set CRON_SECRET)." }, { status: 503 });
  {
    const url = new URL(request.url);
    const provided =
      (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
      request.headers.get("x-cron-secret") ||
      url.searchParams.get("secret") ||
      "";
    if (provided !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (process.env.AI_PIPELINE_ENABLED !== "true") {
    return NextResponse.json({ skipped: true, reason: "AI_PIPELINE_ENABLED is not 'true'." });
  }

  await ensureSchema();

  // Daily cap: count AI drafts created today (server time) and stop if we're at the ceiling.
  const cap = Math.max(1, Number(process.env.PIPELINE_DAILY_CAP) || 5);
  const todayRows = await sql`SELECT COUNT(*)::int AS n FROM stories WHERE origin = 'ai' AND created_at::date = now()::date`;
  const madeToday = todayRows[0]?.n || 0;
  if (madeToday >= cap) {
    return NextResponse.json({ skipped: true, reason: `Daily cap reached (${madeToday}/${cap}).` });
  }

  const perRun = Math.max(1, Number(process.env.PIPELINE_MAX_PER_RUN) || 3);
  const max = Math.min(perRun, cap - madeToday);
  const result = await runGeneration({ max });
  await audit("cron", "ai.cron", "ai", "desk", { generated: result.generated, madeToday, cap });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
