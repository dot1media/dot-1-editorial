import { NextResponse } from "next/server";
import { newsSql, newsConfigured } from "@/lib/db";
import { requireCapability } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { reads7: 0, reads30: 0, appOpens7: 0, readers7: 0, liveViews30: 0, episodeViews30: 0, dau: [] as any[], topStories: [] as any[], hasData: false };

export async function GET() {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  if (!newsConfigured()) return NextResponse.json(EMPTY);

  try {
    const one = async (q: Promise<any[]>) => { const r = await q; return Number(r[0]?.n || 0); };
    const reads7 = await one(newsSql`SELECT count(*) n FROM events WHERE type='article_view' AND ts > now() - interval '7 days'`);
    const reads30 = await one(newsSql`SELECT count(*) n FROM events WHERE type='article_view' AND ts > now() - interval '30 days'`);
    const appOpens7 = await one(newsSql`SELECT count(*) n FROM events WHERE type='app_open' AND ts > now() - interval '7 days'`);
    const readers7 = await one(newsSql`SELECT count(DISTINCT anon_id) n FROM events WHERE ts > now() - interval '7 days'`);
    const liveViews30 = await one(newsSql`SELECT count(*) n FROM events WHERE type='live_view' AND ts > now() - interval '30 days'`);
    const episodeViews30 = await one(newsSql`SELECT count(*) n FROM events WHERE type='episode_view' AND ts > now() - interval '30 days'`);
    const dau = await newsSql`
      SELECT to_char(date_trunc('day', ts), 'MM-DD') AS day, count(DISTINCT anon_id)::int AS readers
      FROM events WHERE ts > now() - interval '14 days' GROUP BY 1 ORDER BY 1`;
    const topStories = await newsSql`
      SELECT e.target_id AS id, count(*)::int AS views, s.title AS title
      FROM events e LEFT JOIN news_stories s ON s.id = e.target_id
      WHERE e.type='article_view' AND e.ts > now() - interval '30 days' AND e.target_id <> ''
      GROUP BY e.target_id, s.title ORDER BY views DESC LIMIT 8`;
    return NextResponse.json({ reads7, reads30, appOpens7, readers7, liveViews30, episodeViews30, dau, topStories, hasData: true });
  } catch {
    return NextResponse.json(EMPTY); // events table not created until the first event arrives
  }
}
