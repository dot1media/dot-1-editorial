import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { rankRelated } from "@/lib/related";
export const runtime = "nodejs";
// Before creating: does something like this already exist?
export async function GET(req: Request) {
  const gate = await requireCapability("story.view"); if ("response" in gate) return gate.response;
  await ensureSchema();
  const url = new URL(req.url); const q = String(url.searchParams.get("q") || "").trim();
  if (q.length < 6) return NextResponse.json({ matches: [] });
  const rows = (await sql`SELECT id, working_headline, final_headline, summary, status, category FROM stories WHERE status <> 'archived' ORDER BY updated_at DESC LIMIT 600`) as any[];
  return NextResponse.json({ matches: rankRelated({ head: q, sum: "" }, rows, 5) });
}
