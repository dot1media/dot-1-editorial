import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";

export const runtime = "nodejs";

// List media records, newest first, optionally filtered by kind or story.
export async function GET(request: Request) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const storyId = url.searchParams.get("storyId");
  let rows;
  if (storyId) rows = await sql`SELECT * FROM media WHERE story_id = ${storyId} ORDER BY created_at DESC`;
  else if (kind) rows = await sql`SELECT * FROM media WHERE kind = ${kind} ORDER BY created_at DESC LIMIT 300`;
  else rows = await sql`SELECT * FROM media ORDER BY created_at DESC LIMIT 300`;
  return NextResponse.json({ media: rows });
}

// Create a media record after the file is already uploaded to blob (client sends the returned URL
// plus metadata). Kept separate from the upload stream so the record carries editable fields.
export async function POST(request: Request) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const b = await readJson(request);
  const kind = b.kind === "video" ? "video" : "photo";
  const url = String(b.url || "").trim();
  if (!url) return NextResponse.json({ error: "A file URL is required (upload the file first)." }, { status: 400 });

  const id = newId("media");
  await sql`INSERT INTO media (id, kind, url, thumbnail_url, title, caption, description, location, credit, category, duration, tags, story_id, uploaded_by)
    VALUES (${id}, ${kind}, ${url}, ${b.thumbnailUrl || ""}, ${b.title || ""}, ${b.caption || ""},
      ${b.description || ""}, ${b.location || ""}, ${b.credit || ""}, ${b.category || ""}, ${b.duration || ""},
      ${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}, ${b.storyId || null}, ${account.email})`;
  await audit(account.email, "media.create", "media", id, { kind });
  return NextResponse.json({ id, ok: true });
}
