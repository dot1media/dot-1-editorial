import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { audit } from "@/lib/schema";
import { readJson } from "@/lib/api";
import { newsConfigured } from "@/lib/db";
import { publishSourcedPhoto, publishSourcedVideo } from "@/lib/publish";

export const runtime = "nodejs";

// AI desk: post a sourced image to the Lens or a video to the Reel, with a creator
// credit and a credit link. Gated on media.publish. Lands live in the news app.
export async function POST(request: Request) {
  const gate = await requireCapability("media.publish");
  if ("response" in gate) return gate.response;
  const { account } = gate;

  if (!newsConfigured()) {
    return NextResponse.json({ error: "Publishing is not configured. NEWS_DATABASE_URL is missing." }, { status: 503 });
  }

  const b = await readJson(request).catch(() => ({}));
  const kind = b.kind === "video" ? "video" : "photo";
  const url = String(b.url || "").trim();
  if (!url) return NextResponse.json({ error: `No ${kind} URL.` }, { status: 400 });
  const credit = String(b.credit || "").trim();
  if (!credit) return NextResponse.json({ error: "Add a credit for the creator." }, { status: 400 });

  try {
    if (kind === "photo") {
      const { newsId } = await publishSourcedPhoto({
        image: url,
        caption: String(b.caption || "").trim(),
        description: String(b.description || "").trim(),
        location: String(b.location || "").trim(),
        photographer: credit,
        creditUrl: String(b.creditUrl || "").trim(),
        category: b.category ? String(b.category) : null,
        width: Number.isFinite(b.width) ? b.width : null,
        height: Number.isFinite(b.height) ? b.height : null,
      });
      await audit(account.email, "ai.lens.publish", "news_photo", newsId, { credit, creditUrl: b.creditUrl || "" });
      return NextResponse.json({ ok: true, kind, newsId });
    }
    const { newsId } = await publishSourcedVideo({
      videoUrl: url,
      thumbnail: String(b.thumbnail || "").trim(),
      title: String(b.caption || b.title || "").trim(),
      description: String(b.description || "").trim(),
      producer: credit,
      creditUrl: String(b.creditUrl || "").trim(),
      category: b.category ? String(b.category) : undefined,
      durationSeconds: Number.isFinite(b.durationSeconds) ? b.durationSeconds : null,
    });
    await audit(account.email, "ai.reel.publish", "news_video", newsId, { credit, creditUrl: b.creditUrl || "" });
    return NextResponse.json({ ok: true, kind, newsId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Publish failed." }, { status: 400 });
  }
}
