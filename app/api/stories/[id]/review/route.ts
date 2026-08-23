import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability, getSession } from "@/lib/session";
import { readJson } from "@/lib/api";
import { REVIEW_ITEMS } from "@/lib/newsroom";
import { recomputeReviewState } from "@/lib/reviewState";
import { can } from "@/lib/permissions";

export const runtime = "nodejs";

// Toggle checklist items (needs review.complete) or record editor approval (needs review.approve).
// Both land on the same review_checklists row; the action field selects which.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  const action = String(b.action || "toggle");

  await sql`INSERT INTO review_checklists (story_id, items) VALUES (${id}, '{}'::jsonb) ON CONFLICT (story_id) DO NOTHING`;

  if (action === "toggle") {
    if (!can(account.permissions, "review.complete")) {
      return NextResponse.json({ error: "You cannot complete the review checklist." }, { status: 403 });
    }
    const key = String(b.item || "");
    if (!REVIEW_ITEMS.some((it) => it.id === key)) return NextResponse.json({ error: "Unknown checklist item." }, { status: 400 });
    const value = !!b.value;
    // jsonb_set the single key so concurrent edits to other keys are preserved.
    await sql`UPDATE review_checklists SET items = jsonb_set(COALESCE(items, '{}'::jsonb), ARRAY[${key}]::text[], ${JSON.stringify(value)}::jsonb, true),
      completed_by = ${account.email}, updated_at = now() WHERE story_id = ${id}`;
    await audit(account.email, "review.toggle", "story", id, { item: key, value });
  } else if (action === "approve") {
    if (!can(account.permissions, "review.approve")) {
      return NextResponse.json({ error: "You cannot approve stories." }, { status: 403 });
    }
    await sql`UPDATE review_checklists SET approved_by = ${account.email}, approved_at = now(), updated_at = now() WHERE story_id = ${id}`;
    await audit(account.email, "review.approve", "story", id);
  } else if (action === "unapprove") {
    if (!can(account.permissions, "review.approve")) {
      return NextResponse.json({ error: "You cannot change approval." }, { status: 403 });
    }
    await sql`UPDATE review_checklists SET approved_by = NULL, approved_at = NULL, updated_at = now() WHERE story_id = ${id}`;
    await audit(account.email, "review.unapprove", "story", id);
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const state = await recomputeReviewState(id);
  return NextResponse.json({ ok: true, reviewState: state });
}
