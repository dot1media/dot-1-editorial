import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson, slugify } from "@/lib/api";
import { REVIEW_ITEMS } from "@/lib/newsroom";

export const runtime = "nodejs";

// List stories. Any signed-in account with story.view. Supports ?status= and ?q= filters.
export async function GET(request: Request) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  let rows;
  if (status && q) {
    rows = await sql`SELECT * FROM stories WHERE status = ${status} AND (working_headline ILIKE ${"%" + q + "%"} OR final_headline ILIKE ${"%" + q + "%"}) ORDER BY updated_at DESC LIMIT 200`;
  } else if (status) {
    rows = await sql`SELECT * FROM stories WHERE status = ${status} ORDER BY updated_at DESC LIMIT 200`;
  } else if (q) {
    rows = await sql`SELECT * FROM stories WHERE working_headline ILIKE ${"%" + q + "%"} OR final_headline ILIKE ${"%" + q + "%"} ORDER BY updated_at DESC LIMIT 200`;
  } else {
    rows = await sql`SELECT * FROM stories ORDER BY updated_at DESC LIMIT 200`;
  }
  return NextResponse.json({ stories: rows });
}

// Create a story record. Starts at "tip" unless a starting status is given.
export async function POST(request: Request) {
  const gate = await requireCapability("story.create");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();

  const body = await readJson(request);
  const workingHeadline = String(body.workingHeadline || body.working_headline || "").trim();
  if (!workingHeadline) return NextResponse.json({ error: "A working headline is required." }, { status: 400 });

  const id = newId("story");
  const slug = slugify(body.slug || workingHeadline);
  const classification = String(body.classification || "news");
  const category = String(body.category || "world");
  const priority = String(body.priority || "routine");
  const status = String(body.status || "tip");
  const location = String(body.location || "");
  const summary = String(body.summary || "");

  await sql`INSERT INTO stories (id, slug, working_headline, summary, classification, category, location, priority, status, created_by, reporter_email)
    VALUES (${id}, ${slug}, ${workingHeadline}, ${summary}, ${classification}, ${category}, ${location}, ${priority}, ${status}, ${account.email}, ${account.email})`;

  // Seed an empty review checklist so the review view always has a row to work with.
  const emptyItems: Record<string, boolean> = {};
  for (const it of REVIEW_ITEMS) emptyItems[it.id] = false;
  await sql`INSERT INTO review_checklists (story_id, items) VALUES (${id}, ${JSON.stringify(emptyItems)})
    ON CONFLICT (story_id) DO NOTHING`;

  await audit(account.email, "story.create", "story", id, { workingHeadline });
  return NextResponse.json({ id, ok: true });
}
