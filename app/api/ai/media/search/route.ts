import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { searchPhotos, searchVideos } from "@/lib/ai/mediaSearch";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI desk: find license-clear media (with creator + credit link) for the Lens (photos)
// and Reel (videos). Gated on media.upload.
export async function POST(request: Request) {
  const gate = await requireCapability("media.upload");
  if ("response" in gate) return gate.response;

  const b = await readJson(request).catch(() => ({}));
  const kind = b.kind === "video" ? "video" : "photo";
  const q = String(b.q || "").trim();
  if (q.length < 2) return NextResponse.json({ error: "Enter a search term." }, { status: 400 });

  try {
    const items = kind === "video" ? await searchVideos(q) : await searchPhotos(q);
    return NextResponse.json({ kind, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Search failed." }, { status: 400 });
  }
}
