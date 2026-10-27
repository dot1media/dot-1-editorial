import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

const STATUSES = new Set(["draft", "approved", "scheduled", "posted", "failed"]);
const TARGETS = new Set(["instagram", "facebook"]);

// Edit a queued post: captions, targets, status (approve), schedule time.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("publish.toNews");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(req);

  const rows = (await sql`SELECT id, status FROM social_posts WHERE id = ${id} LIMIT 1`) as any[];
  if (!rows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (typeof b.caption_instagram === "string") {
    await sql`UPDATE social_posts SET caption_instagram=${b.caption_instagram}, updated_at=now() WHERE id=${id}`;
  }
  if (typeof b.caption_facebook === "string") {
    await sql`UPDATE social_posts SET caption_facebook=${b.caption_facebook}, updated_at=now() WHERE id=${id}`;
  }
  if (Array.isArray(b.targets)) {
    const t = b.targets.filter((x: string) => TARGETS.has(x));
    await sql`UPDATE social_posts SET targets=${JSON.stringify(t)}, updated_at=now() WHERE id=${id}`;
  }
  if (typeof b.status === "string" && STATUSES.has(b.status)) {
    await sql`UPDATE social_posts SET status=${b.status}, error='', updated_at=now() WHERE id=${id}`;
    await audit(account.email, "social.status", "social", id, { status: b.status });
  }
  if ("scheduled_at" in b) {
    const at = b.scheduled_at ? new Date(b.scheduled_at).toISOString() : null;
    await sql`UPDATE social_posts SET scheduled_at=${at}, updated_at=now() WHERE id=${id}`;
  }

  const updated = (await sql`SELECT * FROM social_posts WHERE id = ${id} LIMIT 1`) as any[];
  return NextResponse.json({ post: updated[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("publish.toNews");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  await sql`DELETE FROM social_posts WHERE id = ${id}`;
  await audit(account.email, "social.delete", "social", id, {});
  return NextResponse.json({ ok: true });
}
