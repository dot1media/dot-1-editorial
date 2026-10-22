import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { audit } from "@/lib/schema";
import { readJson } from "@/lib/api";
import { generateFromYouTube } from "@/lib/ai/run";

export const runtime = "nodejs";
// One video, but still a two-pass write + score plus the transcript fetch.
export const maxDuration = 300;

// AI desk: create a draft news story from a pasted YouTube link. Gated on
// story.create. Lands as an editorial story in the verification stage, exactly
// like a wire draft, for the newsroom to review, rate, and publish.
export async function POST(request: Request) {
  const gate = await requireCapability("story.create");
  if ("response" in gate) return gate.response;
  const { account } = gate;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Generation is not configured. ANTHROPIC_API_KEY is missing." }, { status: 503 });
  }

  const b = await readJson(request).catch(() => ({}));
  const url = String(b.url || "").trim();
  const category = b.category ? String(b.category) : undefined;
  if (!url) return NextResponse.json({ error: "Paste a YouTube link first." }, { status: 400 });

  try {
    const draft = await generateFromYouTube(url, category);
    await audit(account.email, "ai.youtube", "story", draft.id, { url, headline: draft.headline });
    return NextResponse.json({ ok: true, draft });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create a story from that video." }, { status: 400 });
  }
}
