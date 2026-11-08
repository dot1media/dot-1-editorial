import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { getTopicPrefs, setTopicPrefs } from "@/lib/ai/topics";
import { audit } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Topic preferences for the AI desk: which topics it reaches for, and how much
// it weights each, so the edition is balanced across topics instead of flooded
// with one beat. Gated on story.create, the same capability as generation.
export async function GET() {
  const gate = await requireCapability("story.create");
  if ("response" in gate) return gate.response;
  try {
    return NextResponse.json({ topics: await getTopicPrefs() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load topics." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const gate = await requireCapability("story.create");
  if ("response" in gate) return gate.response;
  const { account } = gate;

  const b = await readJson(request).catch(() => ({}));
  const topics = Array.isArray(b?.topics) ? b.topics : null;
  if (!topics) return NextResponse.json({ error: "Send a 'topics' array." }, { status: 400 });

  try {
    await setTopicPrefs(topics);
    await audit(account.email, "ai.topics.update", "ai", "desk", { count: topics.length });
    return NextResponse.json({ topics: await getTopicPrefs() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not save topics." }, { status: 503 });
  }
}
