import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { requireCapability } from "@/lib/session";

export const runtime = "nodejs";

// Recent AI-generated drafts, for the AI desk view.
export async function GET() {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const rows = await sql`SELECT id, working_headline, final_headline, source_name, source_url, review_state, status, scores, created_at
    FROM stories WHERE origin = 'ai' ORDER BY created_at DESC LIMIT 100`;
  return NextResponse.json({ drafts: rows });
}
