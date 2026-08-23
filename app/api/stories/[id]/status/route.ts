import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { STORY_LIFECYCLE, STORY_FLAGS } from "@/lib/newsroom";

export const runtime = "nodejs";

const VALID_STATUS = new Set(STORY_LIFECYCLE.map((s) => s.id));
const VALID_FLAGS = new Set(STORY_FLAGS.map((f) => f.id));

// Move a story along the lifecycle, or set its non-linear flags (hold, killed, etc).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.changeStatus");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  if (b.status) {
    if (!VALID_STATUS.has(b.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    // "published" is set only by the publish route; block manual jumps to it here.
    if (b.status === "published") {
      return NextResponse.json({ error: "Use Publish to move a story to Published." }, { status: 400 });
    }
    await sql`UPDATE stories SET status = ${b.status}, updated_at = now() WHERE id = ${id}`;
    await audit(account.email, "story.status", "story", id, { status: b.status });
  }

  if (Array.isArray(b.flags)) {
    const flags = b.flags.filter((f: string) => VALID_FLAGS.has(f as any));
    await sql`UPDATE stories SET flags = ${JSON.stringify(flags)}, updated_at = now() WHERE id = ${id}`;
    await audit(account.email, "story.flags", "story", id, { flags });
  }

  return NextResponse.json({ ok: true });
}
