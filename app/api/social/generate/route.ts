import { NextResponse } from "next/server";
import { sql, newsSql, newsConfigured } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { buildCaptions } from "@/lib/social/caption";
import crypto from "crypto";

export const runtime = "nodejs";

// Build draft social posts from published news stories that are not yet queued.
// Body may specify { newsStoryId } for one story, or { limit } to sweep the most
// recent published stories. Drafts land in the review queue; nothing posts here.
export async function POST(req: Request) {
  const gate = await requireCapability("publish.toNews");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  if (!newsConfigured()) return NextResponse.json({ error: "News database not configured." }, { status: 503 });
  await ensureSchema();

  const body = await readJson(req).catch(() => ({}));
  const only = String(body.newsStoryId || "").trim();
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 30);

  let stories: any[];
  if (only) {
    stories = (await newsSql`
      SELECT id, title, summary, image, category, COALESCE(verification_status,'verified') AS verification_status
      FROM news_stories WHERE id = ${only} LIMIT 1`) as any[];
  } else {
    stories = (await newsSql`
      SELECT id, title, summary, image, category, COALESCE(verification_status,'verified') AS verification_status
      FROM news_stories
      WHERE status='published' AND review_status='approved'
      ORDER BY published_at DESC NULLS LAST
      LIMIT ${limit}`) as any[];
  }

  const created: { id: string; headline: string }[] = [];
  const skipped: string[] = [];

  // Alternate the card style (a/b) so the grid looks varied. Continue the A/B
  // rhythm from how many posts already exist, so new drafts keep alternating.
  const [{ cnt }] = (await sql`SELECT COUNT(*)::int AS cnt FROM social_posts`) as any[];
  let n = Number(cnt) || 0;

  for (const s of stories) {
    if (!s.image) { skipped.push(s.id); continue; } // need a photo for the card
    const existing = (await sql`SELECT id FROM social_posts WHERE news_story_id = ${s.id} LIMIT 1`) as any[];
    if (existing.length) { skipped.push(s.id); continue; }

    const style = ["a", "b", "c"][n % 3];
    n += 1;
    const caps = buildCaptions({ newsStoryId: s.id, title: s.title, summary: s.summary, category: s.category });
    const id = `sp_${crypto.randomBytes(8).toString("base64url")}`;
    await sql`
      INSERT INTO social_posts (id, news_story_id, headline, summary, category, verification_status, style, image_url,
        caption_instagram, caption_facebook, targets, status, created_by)
      VALUES (${id}, ${s.id}, ${s.title}, ${s.summary || ""}, ${s.category || ""}, ${s.verification_status}, ${style},
        ${s.image}, ${caps.instagram}, ${caps.facebook}, ${JSON.stringify(["instagram", "facebook"])}, 'draft', ${account.email})
    `;
    created.push({ id, headline: s.title });
  }

  if (created.length) await audit(account.email, "social.generate", "social", only || "sweep", { created: created.length });
  return NextResponse.json({ created, skipped });
}
