import { NextResponse } from "next/server";
import { newsSql, newsConfigured } from "@/lib/db";
import { requireCapability } from "@/lib/session";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/schema";
import { readJson } from "@/lib/api";
import { playbackUrls, thumbnailUrl, cfGetVideo } from "@/lib/cloudflare";
import { sendPushToAll } from "@/lib/push";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDur(s: number) {
  if (!s) return "";
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

// Publish (or draft) an episode after its file finished uploading to Cloudflare.
export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  if (!can(account.permissions, "media.publish") && !can(account.permissions, "broadcast.golive"))
    return NextResponse.json({ error: "You don't have permission to publish episodes." }, { status: 403 });
  if (!newsConfigured()) return NextResponse.json({ error: "News database isn't configured." }, { status: 503 });

  const b = await readJson(request);
  const uid = (b.uid || "").toString();
  if (!uid) return NextResponse.json({ error: "Missing video id." }, { status: 400 });
  const title = (b.title || "Untitled Episode").toString().slice(0, 200);
  const description = (b.description || "").toString().slice(0, 5000);
  const category = (b.category || "news").toString().slice(0, 40);
  const producer = (b.producer || "Dot 1 News").toString().slice(0, 120);
  const publish = b.publish !== false; // default publish

  const hls = playbackUrls(uid).hls;
  const thumb = thumbnailUrl(uid);
  const details = await cfGetVideo(uid); // best-effort duration
  const durSec = details?.durationSeconds || 0;

  const id = `news_vid_${crypto.randomBytes(9).toString("base64url")}`;
  const now = new Date().toISOString();
  await newsSql`INSERT INTO videos (
    id, title, description, thumbnail, video_url, duration, duration_seconds,
    video_format, category, video_style, producer, status, date, published_at
  ) VALUES (
    ${id}, ${title}, ${description}, ${thumb}, ${hls}, ${fmtDur(durSec)}, ${durSec},
    'hls', ${category}, 'episode', ${producer}, ${publish ? "published" : "draft"}, ${now}, ${publish ? now : null}
  )`;
  await audit(account.email, "episode.publish", "video", id, { uid, publish });
  if (publish) sendPushToAll("New episode", title, { type: "episode" }).catch(() => {});
  return NextResponse.json({ ok: true, id, published: publish });
}
