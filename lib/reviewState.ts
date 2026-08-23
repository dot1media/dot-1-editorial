import { sql } from "@/lib/db";
import { reviewComplete, ReviewState } from "@/lib/newsroom";

// Derive the review ladder from the story's actual state. This is the single place that decides
// whether a story is NOT VERIFIED, PARTIALLY VERIFIED, VERIFIED, EDITOR APPROVED, or READY TO
// PUBLISH, so the rule is consistent everywhere. Editor approval is a human act stored on the
// checklist row; it is never inferred. Ready-to-publish requires BOTH a complete checklist AND
// editor approval, which is the gate the publish route enforces.
export async function recomputeReviewState(storyId: string): Promise<ReviewState> {
  const [claimsRows, checklistRows] = await Promise.all([
    sql`SELECT status FROM verification_claims WHERE story_id = ${storyId}`,
    sql`SELECT items, approved_by FROM review_checklists WHERE story_id = ${storyId} LIMIT 1`,
  ]);

  const claims = claimsRows as { status: string }[];
  const items = (checklistRows[0]?.items || {}) as Record<string, boolean>;
  const approvedBy = checklistRows[0]?.approved_by || null;

  const checklistDone = reviewComplete(items);
  const anyClaims = claims.length > 0;
  const allConfirmed = anyClaims && claims.every((c) => c.status === "confirmed");
  const someConfirmed = claims.some((c) => c.status === "confirmed");
  const anyFalseOrDisputed = claims.some((c) => c.status === "false" || c.status === "disputed");

  let state: ReviewState = "not_verified";

  // Verification dimension first.
  if (allConfirmed && !anyFalseOrDisputed) state = "verified";
  else if (someConfirmed) state = "partially_verified";
  else state = "not_verified";

  // Editorial dimension can only raise the state when verification is at least "verified".
  if (state === "verified" && approvedBy) state = "editor_approved";
  if (state === "editor_approved" && checklistDone) state = "ready_to_publish";

  await sql`UPDATE stories SET review_state = ${state}, updated_at = now() WHERE id = ${storyId}`;
  return state;
}
