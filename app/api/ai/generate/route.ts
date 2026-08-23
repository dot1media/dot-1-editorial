import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { audit } from "@/lib/schema";
import { readJson } from "@/lib/api";
import { runGeneration } from "@/lib/ai/run";

export const runtime = "nodejs";
// Generation calls the model per story across several feeds, so give it room.
export const maxDuration = 300;

// Manual "generate now" for the AI desk. Gated on story.create (making stories). Pulls RSS
// candidates, dedupes, generates drafts, and lands them as editorial stories in the verification
// stage for the newsroom to review, rate, and publish. Cron can call this same path later.
export async function POST(request: Request) {
  const gate = await requireCapability("story.create");
  if ("response" in gate) return gate.response;
  const { account } = gate;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Generation is not configured. ANTHROPIC_API_KEY is missing." }, { status: 503 });
  }

  const b = await readJson(request).catch(() => ({}));
  const max = Number(b.max) || 3;
  const result = await runGeneration({ max });
  await audit(account.email, "ai.generate", "ai", "desk", { generated: result.generated, considered: result.considered });
  return NextResponse.json(result);
}
