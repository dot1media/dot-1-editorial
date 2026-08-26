import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson, slugify } from "@/lib/api";

export const runtime = "nodejs";

// Full story bundle: the record plus every related collection, in one call.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const { id } = await params;

  const storyRows = await sql`SELECT * FROM stories WHERE id = ${id} LIMIT 1`;
  if (!storyRows.length) return NextResponse.json({ error: "Story not found." }, { status: 404 });

  const [sources, evidence, log, claims, checklist, corrections] = await Promise.all([
    sql`SELECT * FROM story_sources WHERE story_id = ${id} ORDER BY created_at`,
    sql`SELECT * FROM story_evidence WHERE story_id = ${id} ORDER BY created_at`,
    sql`SELECT * FROM reporting_log WHERE story_id = ${id} ORDER BY created_at`,
    sql`SELECT * FROM verification_claims WHERE story_id = ${id} ORDER BY created_at`,
    sql`SELECT * FROM review_checklists WHERE story_id = ${id} LIMIT 1`,
    sql`SELECT * FROM corrections WHERE story_id = ${id} ORDER BY created_at DESC`,
  ]);

  return NextResponse.json({
    story: storyRows[0],
    sources, evidence, log, claims,
    checklist: checklist[0] || null,
    corrections,
  });
}

// Edit story content fields. Each field uses a present-or-keep sentinel so only supplied fields
// change, all in one parameterized statement (no dynamic SQL).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.edit");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const has = (k: string) => k in b;
  const s = (k: string): string => (b[k] == null ? "" : String(b[k]));
  const slug = has("slug") ? slugify(s("slug")) : "";
  const planned = has("plannedPublishAt") ? (b.plannedPublishAt || null) : null;

  await sql`UPDATE stories SET
    working_headline = CASE WHEN ${has("workingHeadline")} THEN ${s("workingHeadline")} ELSE working_headline END,
    final_headline   = CASE WHEN ${has("finalHeadline")}   THEN ${s("finalHeadline")}   ELSE final_headline END,
    summary          = CASE WHEN ${has("summary")}         THEN ${s("summary")}         ELSE summary END,
    body             = CASE WHEN ${has("body")}            THEN ${s("body")}            ELSE body END,
    classification   = CASE WHEN ${has("classification")}  THEN ${s("classification")}  ELSE classification END,
    category         = CASE WHEN ${has("category")}        THEN ${s("category")}        ELSE category END,
    location         = CASE WHEN ${has("location")}        THEN ${s("location")}        ELSE location END,
    priority         = CASE WHEN ${has("priority")}        THEN ${s("priority")}        ELSE priority END,
    hero_image       = CASE WHEN ${has("heroImage")}       THEN ${s("heroImage")}       ELSE hero_image END,
    hero_image_credit = CASE WHEN ${has("heroImageCredit")} THEN ${s("heroImageCredit")} ELSE hero_image_credit END,
    why_publish      = CASE WHEN ${has("whyPublish")}      THEN ${s("whyPublish")}      ELSE why_publish END,
    slug             = CASE WHEN ${has("slug")}            THEN ${slug}                 ELSE slug END,
    planned_publish_at = CASE WHEN ${has("plannedPublishAt")} THEN ${planned} ELSE planned_publish_at END,
    updated_at = now()
    WHERE id = ${id}`;

  await audit(account.email, "story.edit", "story", id, { fields: Object.keys(b) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.delete");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  await sql`DELETE FROM stories WHERE id = ${id}`;
  await audit(account.email, "story.delete", "story", id);
  return NextResponse.json({ ok: true });
}
