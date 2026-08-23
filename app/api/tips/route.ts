import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";

export const runtime = "nodejs";

// Public submission from the Submit a News Tip / Contact pages. No auth: anyone can send a tip.
export async function POST(request: Request) {
  await ensureSchema();
  const b = await readJson(request);
  const body = String(b.body || "").trim();
  if (!body) return NextResponse.json({ error: "Please include a message." }, { status: 400 });
  const kind = b.kind === "contact" ? "contact" : "tip";
  const anonymous = !!b.anonymous;
  const id = newId("tip");
  await sql`INSERT INTO tips (id, kind, name, contact, location, subject, body, anonymous)
    VALUES (${id}, ${kind}, ${anonymous ? "" : b.name || ""}, ${anonymous ? "" : b.contact || ""},
      ${b.location || ""}, ${b.subject || ""}, ${body}, ${anonymous})`;
  return NextResponse.json({ ok: true });
}

// Newsroom list. Requires story.view (anyone in the newsroom can triage tips).
export async function GET(request: Request) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const rows = status
    ? await sql`SELECT * FROM tips WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`
    : await sql`SELECT * FROM tips ORDER BY created_at DESC LIMIT 200`;
  return NextResponse.json({ tips: rows });
}

// Update a tip's triage status, or promote it to a story.
export async function PATCH(request: Request) {
  const gate = await requireCapability("story.create");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const b = await readJson(request);
  if (!b.id) return NextResponse.json({ error: "Tip id required." }, { status: 400 });

  if (b.promote) {
    const tipRows = await sql`SELECT * FROM tips WHERE id = ${b.id} LIMIT 1`;
    if (!tipRows.length) return NextResponse.json({ error: "Tip not found." }, { status: 404 });
    const tip = tipRows[0];
    const storyId = newId("story");
    const headline = (tip.subject || tip.body).slice(0, 120);
    await sql`INSERT INTO stories (id, working_headline, summary, location, status, created_by, reporter_email)
      VALUES (${storyId}, ${headline}, ${tip.body}, ${tip.location || ""}, 'assessment', ${account.email}, ${account.email})`;
    await sql`UPDATE tips SET status = 'promoted', linked_story_id = ${storyId} WHERE id = ${b.id}`;
    await audit(account.email, "tip.promote", "tip", b.id, { storyId });
    return NextResponse.json({ ok: true, storyId });
  }

  await sql`UPDATE tips SET status = ${b.status || "reviewed"} WHERE id = ${b.id}`;
  await audit(account.email, "tip.status", "tip", b.id, { status: b.status });
  return NextResponse.json({ ok: true });
}
