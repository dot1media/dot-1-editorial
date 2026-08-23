import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { audit } from "@/lib/schema";

export const runtime = "nodejs";

// Stream one file to blob storage and return its public URL. Used for story hero images, evidence,
// and standalone media. The client sends the raw file body with a Content-Type header; we key the
// object by kind and a timestamp and let blob add a random suffix so names never collide.
// Requires media.upload. The heavy lifting (resizing images, choosing a video thumbnail) happens
// client-side before upload so this route stays a thin, fast pass-through.

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB ceiling; video is the reason it is this high

export async function POST(request: Request) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;
  const { account } = gate;

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || "file"; // photo | video | thumbnail | hero | evidence
  const nameHint = (url.searchParams.get("name") || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);

  const lenHeader = request.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (200 MB max)." }, { status: 413 });
  }
  if (!request.body) return NextResponse.json({ error: "Empty upload." }, { status: 400 });

  try {
    const blob = await put(`${kind}/${Date.now()}-${nameHint}`, request.body, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    await audit(account.email, "media.upload", "media", blob.url, { kind, contentType });
    return NextResponse.json({ url: blob.url, contentType });
  } catch (e: any) {
    const msg = e && e.message ? e.message : String(e);
    // Most common cause is a missing blob token; surface it plainly.
    const hint = /token|BLOB_READ_WRITE/i.test(msg)
      ? "Blob storage is not configured. Add the Vercel Blob store to this project (BLOB_READ_WRITE_TOKEN)."
      : msg;
    return NextResponse.json({ error: "Upload failed: " + hint }, { status: 500 });
  }
}
