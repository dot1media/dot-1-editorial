import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

// Assign people to newsroom roles on a story. One person may hold several roles (small newsroom),
// so each field is independent and any may be blank. Values are account emails. Only fields
// present in the request are changed; absent fields keep their current value via a sentinel.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.assign");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const has = (r: string) => r in b;
  const val = (r: string): string | null => (b[r] ? String(b[r]).toLowerCase() : null);

  await sql`UPDATE stories SET
    reporter_email     = CASE WHEN ${has("reporter")}     THEN ${val("reporter")}     ELSE reporter_email END,
    editor_email       = CASE WHEN ${has("editor")}       THEN ${val("editor")}       ELSE editor_email END,
    producer_email     = CASE WHEN ${has("producer")}     THEN ${val("producer")}     ELSE producer_email END,
    photographer_email = CASE WHEN ${has("photographer")} THEN ${val("photographer")} ELSE photographer_email END,
    anchor_email       = CASE WHEN ${has("anchor")}       THEN ${val("anchor")}       ELSE anchor_email END,
    director_email     = CASE WHEN ${has("director")}     THEN ${val("director")}     ELSE director_email END,
    updated_at = now()
    WHERE id = ${id}`;

  await audit(account.email, "story.assign", "story", id, b);
  return NextResponse.json({ ok: true });
}
