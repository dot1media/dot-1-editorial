import { NextResponse } from "next/server";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { publishPost, editorialOrigin } from "@/lib/social/post";

export const runtime = "nodejs";
export const maxDuration = 60;

// Post one queued item now (used by the "Post now" button in review).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("publish.toNews");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;

  const result = await publishPost(id, editorialOrigin(req));
  await audit(account.email, result.ok ? "social.posted" : "social.post_failed", "social", id, {
    igPostId: result.igPostId, fbPostId: result.fbPostId, error: result.error,
  });

  if (!result.ok) return NextResponse.json(result, { status: 502 });
  return NextResponse.json(result);
}
