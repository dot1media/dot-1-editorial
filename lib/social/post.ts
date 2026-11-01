/**
 * Posting orchestration for the social queue. Renders the branded card for a
 * queued post, snapshots it to Vercel Blob as a stable public JPEG, and
 * publishes to the selected platforms through the Meta Graph API. Every result,
 * success or failure, is written back to the row so nothing posts twice and
 * nothing fails silently.
 */
import { put } from "@vercel/blob";
import { sql } from "@/lib/db";
import { postToFacebook, postToInstagram, metaConfigured } from "@/lib/social/meta";
import { postToX, xConfigured } from "@/lib/social/x";

export function editorialOrigin(req?: Request): string {
  if (req) {
    try { return new URL(req.url).origin; } catch { /* fall through */ }
  }
  if (process.env.EDITORIAL_PUBLIC_BASE) return process.env.EDITORIAL_PUBLIC_BASE;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://editorial.dot1.media";
}

/** Render the card via the public card route, store a stable JPEG in Blob, return its URL. */
export async function renderAndStoreCard(id: string, origin: string): Promise<string> {
  const cardUrl = `${origin}/api/social/card/${encodeURIComponent(id)}?format=ig_portrait`;
  const res = await fetch(cardUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`card render failed: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const blob = await put(`social/${id}.jpg`, bytes, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });
  return blob.url;
}

export interface PublishResult {
  ok: boolean;
  igPostId?: string;
  fbPostId?: string;
  xPostId?: string;
  error?: string;
}

/**
 * Publish one queued post to its selected targets. Idempotent per target: a
 * platform that already has an id is skipped, so a retry only fills the gaps.
 */
export async function publishPost(id: string, origin: string): Promise<PublishResult> {
  const rows = (await sql`SELECT * FROM social_posts WHERE id = ${id} LIMIT 1`) as any[];
  if (!rows.length) return { ok: false, error: "Post not found." };
  const post = rows[0];

  const targets: string[] = Array.isArray(post.targets) ? post.targets : JSON.parse(post.targets || "[]");
  const wantedIg = targets.includes("instagram");
  const wantedFb = targets.includes("facebook");
  const wantedX = targets.includes("x");

  // Need at least one selected platform that is actually configured, or there is
  // nothing we can do.
  const metaUsable = (wantedIg || wantedFb) && metaConfigured();
  const xUsable = wantedX && xConfigured();
  if (!metaUsable && !xUsable) {
    return { ok: false, error: "No selected platform is configured (check Meta and X credentials)." };
  }

  let igId: string = post.ig_post_id || "";
  let fbId: string = post.fb_post_id || "";
  let xId: string = post.x_post_id || "";

  let imageUrl: string;
  try {
    imageUrl = await renderAndStoreCard(id, origin);
  } catch (e: any) {
    await sql`UPDATE social_posts SET status='failed', error=${`card: ${e?.message || e}`}, updated_at=now() WHERE id=${id}`;
    return { ok: false, error: `card: ${e?.message || e}` };
  }

  const errors: string[] = [];

  if (wantedIg && !igId) {
    if (!metaConfigured()) errors.push("instagram: Meta not configured");
    else try { igId = await postToInstagram(imageUrl, String(post.caption_instagram || "")); }
    catch (e: any) { errors.push(`instagram: ${e?.message || e}`); }
  }
  if (wantedFb && !fbId) {
    if (!metaConfigured()) errors.push("facebook: Meta not configured");
    else try { fbId = await postToFacebook(imageUrl, String(post.caption_facebook || "")); }
    catch (e: any) { errors.push(`facebook: ${e?.message || e}`); }
  }
  if (wantedX && !xId) {
    if (!xConfigured()) errors.push("x: X not configured");
    else try { xId = await postToX(imageUrl, String(post.caption_x || post.caption_facebook || "")); }
    catch (e: any) { errors.push(`x: ${e?.message || e}`); }
  }

  const allDone = (!wantedIg || !!igId) && (!wantedFb || !!fbId) && (!wantedX || !!xId);
  const status = allDone ? "posted" : errors.length ? "failed" : post.status;
  const err = errors.join(" | ");

  await sql`
    UPDATE social_posts
    SET ig_post_id=${igId}, fb_post_id=${fbId}, x_post_id=${xId},
        status=${status},
        posted_at=${allDone ? new Date().toISOString() : post.posted_at},
        error=${err},
        updated_at=now()
    WHERE id=${id}
  `;

  return { ok: allDone, igPostId: igId, fbPostId: fbId, xPostId: xId, error: err || undefined };
}
