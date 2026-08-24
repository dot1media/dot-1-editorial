import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { listArticles, listPhotos, listVideos } from "@/lib/newsArchive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Browse content already posted to the news site. ?type=articles|photos|videos
export async function GET(request: Request) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "articles";
  const q = url.searchParams.get("q") || "";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 60, 100);
  const offset = Number(url.searchParams.get("offset")) || 0;

  try {
    let items: any[] = [];
    if (type === "photos") items = await listPhotos({ q, limit, offset });
    else if (type === "videos") items = await listVideos({ q, limit, offset });
    else items = await listArticles({ q, limit, offset });
    return NextResponse.json({ type, items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not load published content." }, { status: 503 });
  }
}
