import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { metaConfigured } from "@/lib/social/meta";
import { publishPost, editorialOrigin } from "@/lib/social/post";

export const runtime = "nodejs";
export const maxDuration = 60;

// Posts at most one queued item per run, on a spaced cadence. Explicitly
// scheduled items go at their time; approved-but-unscheduled items fill daytime
// slots, capped per day and spaced apart, so the feed never clusters.
const DAILY_CAP = Number(process.env.SOCIAL_DAILY_CAP || 3);
const MIN_GAP_HOURS = Number(process.env.SOCIAL_MIN_GAP_HOURS || 3);
const ACTIVE_START = Number(process.env.SOCIAL_ACTIVE_START || 8); // Alaska local hour
const ACTIVE_END = Number(process.env.SOCIAL_ACTIVE_END || 20);
const TZ = process.env.SOCIAL_TZ || "America/Anchorage";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const url = new URL(req.url);
  return (
    req.headers.get("authorization") === `Bearer ${secret}` ||
    req.headers.get("x-cron-secret") === secret ||
    url.searchParams.get("secret") === secret
  );
}

function localHour(tz: string): number {
  const s = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date());
  const h = parseInt(s, 10);
  return Number.isNaN(h) ? new Date().getUTCHours() : h % 24;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  if (!metaConfigured()) return NextResponse.json({ error: "Meta not configured." }, { status: 503 });
  await ensureSchema();

  // 1. Explicitly scheduled items that are due go first, regardless of windows.
  let pick = (await sql`
    SELECT id FROM social_posts
    WHERE status IN ('approved','scheduled') AND scheduled_at IS NOT NULL AND scheduled_at <= now()
    ORDER BY scheduled_at ASC LIMIT 1`) as any[];

  let reason = "scheduled";

  if (!pick.length) {
    // 2. Spacing gate for approved-but-unscheduled items.
    const hour = localHour(TZ);
    if (hour < ACTIVE_START || hour >= ACTIVE_END) {
      return NextResponse.json({ posted: null, skipped: "outside active hours", hour });
    }
    const [{ cnt }] = (await sql`SELECT COUNT(*)::int AS cnt FROM social_posts WHERE status='posted' AND posted_at > now() - interval '24 hours'`) as any[];
    if (cnt >= DAILY_CAP) return NextResponse.json({ posted: null, skipped: "daily cap reached", cnt });
    const [{ last }] = (await sql`SELECT MAX(posted_at) AS last FROM social_posts WHERE status='posted'`) as any[];
    if (last && Date.now() - new Date(last).getTime() < MIN_GAP_HOURS * 3600 * 1000) {
      return NextResponse.json({ posted: null, skipped: "min gap not elapsed" });
    }
    pick = (await sql`
      SELECT id FROM social_posts
      WHERE status='approved' AND scheduled_at IS NULL
      ORDER BY created_at ASC LIMIT 1`) as any[];
    reason = "slot";
  }

  if (!pick.length) return NextResponse.json({ posted: null, skipped: "nothing eligible" });

  const id = pick[0].id;
  const result = await publishPost(id, editorialOrigin(req));
  await audit("system@scheduler", result.ok ? "social.posted" : "social.post_failed", "social", id, { reason, ...result });
  return NextResponse.json({ posted: id, reason, result });
}
