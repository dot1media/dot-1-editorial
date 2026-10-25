import { NextResponse } from "next/server";
import { sql, newsSql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

const VALID = new Set(["verified", "pending", "unverified"]);

// Set a story's verification status (the gold/orange/red dot the reader sees). The editor can set
// the status directly and, with "override", pin it so the review process will not move it. If the
// story is already published, the change is pushed straight to the news row so the app and the news
// website update without a full re-publish.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.changeStatus");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const status = String(b.status || "").trim();
  if (!VALID.has(status)) {
    return NextResponse.json({ error: "Status must be verified, pending, or unverified." }, { status: 400 });
  }
  const override = !!b.override;

  const rows = await sql`SELECT news_story_id FROM stories WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Story not found." }, { status: 404 });

  await sql`UPDATE stories SET verification_status = ${status}, verification_override = ${override}, updated_at = now() WHERE id = ${id}`;
  await audit(account.email, "story.verification", "story", id, { status, override });

  // If live, reflect it in the reader feed immediately.
  const newsId = rows[0]?.news_story_id;
  let pushedLive = false;
  if (newsId && newsConfigured() && newsSql) {
    try {
      await newsSql`ALTER TABLE news_stories ADD COLUMN IF NOT EXISTS verification_status TEXT`;
      await newsSql`ALTER TABLE news_stories ADD COLUMN IF NOT EXISTS verification_override BOOLEAN NOT NULL DEFAULT false`;
      await newsSql`UPDATE news_stories SET verification_status = ${status}, verification_override = ${override}, updated_at = now() WHERE id = ${newsId}`;
      pushedLive = true;
    } catch {
      // best effort; the next publish will carry it
    }
  }

  return NextResponse.json({ ok: true, status, override, pushedLive });
}
