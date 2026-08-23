import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId } from "@/lib/api";
import { IMAGE_MIME, VIDEO_MIME, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/newsroom";

export const runtime = "nodejs";
export const maxDuration = 60;

// Upload one image or video. The body IS the file bytes (streamed), with metadata in query params,
// which keeps memory flat for large videos. Mirrors the portal's proven put() pattern. The Blob
// token is read from the ambient BLOB_READ_WRITE_TOKEN env by @vercel/blob; no token in code.
export async function POST(request: Request) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();

  const url = new URL(request.url);
  const mime = request.headers.get("content-type") || "";
  const fileName = String(url.searchParams.get("filename") || "upload");
  const storyId = url.searchParams.get("story") || null;

  const isImage = IMAGE_MIME.includes(mime);
  const isVideo = VIDEO_MIME.includes(mime);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type. Use JPEG, PNG, WebP, MP4, WebM, or MOV." }, { status: 400 });
  }
  if (!request.body) return NextResponse.json({ error: "Empty upload." }, { status: 400 });

  const declaredSize = Number(request.headers.get("content-length") || 0);
  const cap = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (declaredSize && declaredSize > cap) {
    return NextResponse.json({ error: `File is too large. Limit is ${Math.round(cap / 1024 / 1024)} MB.` }, { status: 413 });
  }

  const kind = isImage ? "image" : "video";
  const ext = fileName.includes(".") ? fileName.split(".").pop() : isImage ? "jpg" : "mp4";
  const key = `media/${kind}/${Date.now()}-${newId("f").slice(2)}.${ext}`;

  let blob;
  try {
    blob = await put(key, request.body, { access: "public", contentType: mime, addRandomSuffix: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Upload failed: " + (e?.message || String(e)) }, { status: 500 });
  }

  const id = newId("media");
  await sql`INSERT INTO media_assets (id, kind, blob_url, thumb_url, file_name, mime, size_bytes, story_id, status, uploaded_by)
    VALUES (${id}, ${kind}, ${blob.url}, ${isImage ? blob.url : ""}, ${fileName}, ${mime}, ${declaredSize || null}, ${storyId}, 'library', ${account.email})`;
  await audit(account.email, "media.upload", "media", id, { kind, storyId });

  const rows = await sql`SELECT * FROM media_assets WHERE id = ${id} LIMIT 1`;
  return NextResponse.json({ ok: true, asset: rows[0] });
}

// Media library list. Filter by ?story= or ?kind=.
export async function GET(request: Request) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const url = new URL(request.url);
  const story = url.searchParams.get("story");
  const kind = url.searchParams.get("kind");

  let rows;
  if (story) rows = await sql`SELECT * FROM media_assets WHERE story_id = ${story} ORDER BY created_at DESC`;
  else if (kind) rows = await sql`SELECT * FROM media_assets WHERE kind = ${kind} ORDER BY created_at DESC LIMIT 200`;
  else rows = await sql`SELECT * FROM media_assets ORDER BY created_at DESC LIMIT 200`;
  return NextResponse.json({ assets: rows });
}
