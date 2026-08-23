import { NextResponse } from "next/server";
import { sql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";
import { publishToNews } from "@/lib/publish";

export const runtime = "nodejs";

// Record a correction or update. This never erases anything: it appends a permanent row to the
// corrections ledger capturing what changed, why, who authorized it, and the original publish
// time. If the story is live, we re-sync the news row so readers see the corrected content, and
// we set the "updated"/"correction_required" story flag so the state is visible in the newsroom.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("corrections.manage");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const whatChanged = String(b.whatChanged || "").trim();
  if (!whatChanged) return NextResponse.json({ error: "Describe what changed." }, { status: 400 });
  const kind = b.kind === "update" ? "update" : "correction";

  const rows = await sql`SELECT * FROM stories WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  const story = rows[0];

  const cid = newId("corr");
  await sql`INSERT INTO corrections (id, story_id, kind, what_changed, why_changed, authorized_by, original_published_at)
    VALUES (${cid}, ${id}, ${kind}, ${whatChanged}, ${b.whyChanged || ""}, ${account.email}, ${story.published_at || null})`;

  // Reflect the flag on the story so the newsroom sees it at a glance.
  const flag = kind === "correction" ? "correction_required" : "updated";
  const flags = Array.isArray(story.flags) ? story.flags : [];
  if (!flags.includes(flag)) flags.push(flag);
  await sql`UPDATE stories SET flags = ${JSON.stringify(flags)}, updated_at = now() WHERE id = ${id}`;

  // If it is live, push the corrected content to the same news row.
  let resynced = false;
  if (story.news_story_id && newsConfigured()) {
    await publishToNews(story as any, story.author_name || "Dot 1 Newsroom");
    resynced = true;
  }

  await audit(account.email, "correction.add", "story", id, { cid, kind, resynced });
  return NextResponse.json({ ok: true, id: cid, resynced });
}
