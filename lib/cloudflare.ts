import { sql, newsSql, newsConfigured } from "@/lib/db";

// Cloudflare Stream live integration. The editorial portal is the control plane: it creates/holds
// the live input (ingest URL + stream key stay private here) and, on Go Live, writes the public
// on-air state (is_live + playback URLs) into the news database that the site and app read.
//
// Required env (set on the editorial project):
//   CLOUDFLARE_ACCOUNT_ID          - your Cloudflare account id
//   CLOUDFLARE_STREAM_TOKEN        - API token with Stream:Edit
//   CLOUDFLARE_STREAM_CUSTOMER_CODE- the Stream customer subdomain code (from the Stream dashboard)

const CF_API = "https://api.cloudflare.com/client/v4";

export function cfConfigured(): boolean {
  return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_TOKEN && process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE);
}

function cfEnv() {
  return {
    acct: process.env.CLOUDFLARE_ACCOUNT_ID as string,
    token: process.env.CLOUDFLARE_STREAM_TOKEN as string,
    code: process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE as string,
  };
}

export function playbackUrls(uid: string) {
  const { code } = cfEnv();
  const base = `https://customer-${code}.cloudflarestream.com/${uid}`;
  return { hls: `${base}/manifest/video.m3u8`, dash: `${base}/manifest/video.mpd`, iframe: `${base}/iframe` };
}

async function cf(path: string, init?: RequestInit) {
  const { acct, token } = cfEnv();
  const res = await fetch(`${CF_API}/accounts/${acct}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) {
    const msg = j?.errors?.[0]?.message || `Cloudflare API ${res.status}`;
    throw new Error(msg);
  }
  return j.result;
}

// Create a reusable live input with automatic recording (so an ended stream becomes a VOD).
export async function cfCreateLiveInput(name: string) {
  const r = await cf(`/stream/live_inputs`, {
    method: "POST",
    body: JSON.stringify({ meta: { name }, recording: { mode: "automatic", requireSignedURLs: false } }),
  });
  return { uid: r.uid as string, rtmpsUrl: r.rtmps?.url as string, streamKey: r.rtmps?.streamKey as string, srtUrl: r.srt?.url as string };
}

// Live input status: 'connected' when an encoder (OBS) is pushing, else disconnected/null.
export async function cfLiveInputStatus(uid: string): Promise<string | null> {
  try {
    const r = await cf(`/stream/live_inputs/${uid}`);
    return r?.status?.current?.state || null;
  } catch { return null; }
}

// Provision the tables. live_config (editorial, private) holds the input + key; live_state
// (news DB, public) holds only what the site/app need.
export async function ensureLiveTables() {
  await sql`CREATE TABLE IF NOT EXISTS live_config (
    id text PRIMARY KEY DEFAULT 'current',
    live_input_id text DEFAULT '', rtmps_url text DEFAULT '', stream_key text DEFAULT '',
    hls_url text DEFAULT '', dash_url text DEFAULT '', player_url text DEFAULT '',
    updated_at timestamptz DEFAULT now())`;
  await sql`INSERT INTO live_config (id) VALUES ('current') ON CONFLICT (id) DO NOTHING`;
  if (newsConfigured()) {
    await newsSql`CREATE TABLE IF NOT EXISTS live_state (
      id text PRIMARY KEY DEFAULT 'current',
      is_live boolean NOT NULL DEFAULT false, title text DEFAULT '',
      hls_url text DEFAULT '', player_url text DEFAULT '',
      started_at timestamptz, updated_at timestamptz DEFAULT now())`;
    await newsSql`INSERT INTO live_state (id) VALUES ('current') ON CONFLICT (id) DO NOTHING`;
  }
}

export async function getLiveConfig() {
  const rows = await sql`SELECT * FROM live_config WHERE id = 'current' LIMIT 1`;
  return rows[0] || null;
}

export async function getLiveState() {
  if (!newsConfigured()) return null;
  const rows = await newsSql`SELECT is_live, title, hls_url, player_url, started_at FROM live_state WHERE id = 'current' LIMIT 1`;
  return rows[0] || null;
}

// ---- Recorded episodes: resumable (tus) upload of a finished DaVinci export ----

// Creates a one-time resumable upload URL. The browser uploads the big file straight to Cloudflare
// (not through our server) via tus, so large episode exports work. Returns the video uid + URL.
export async function cfCreateTusUpload(name: string, sizeBytes: number): Promise<{ uid: string; uploadURL: string }> {
  const { acct, token } = cfEnv();
  const meta = `name ${Buffer.from(name).toString("base64")},requiresignedurls ${Buffer.from("false").toString("base64")}`;
  const res = await fetch(`${CF_API}/accounts/${acct}/stream?direct_user=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(sizeBytes),
      "Upload-Metadata": meta,
    },
  });
  if (res.status !== 201) {
    const t = await res.text().catch(() => "");
    throw new Error(`Cloudflare upload create ${res.status}: ${t.slice(0, 160)}`);
  }
  const uploadURL = res.headers.get("Location") || "";
  const uid = res.headers.get("stream-media-id") || "";
  if (!uploadURL || !uid) throw new Error("Cloudflare did not return an upload URL.");
  return { uid, uploadURL };
}

export function thumbnailUrl(uid: string, opts?: { time?: string; height?: number }) {
  const { code } = cfEnv();
  const t = opts?.time || "2s"; const h = opts?.height || 720;
  return `https://customer-${code}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg?time=${t}&height=${h}`;
}

// Best-effort details after upload (duration, ready state). Constructed URLs don't need this.
export async function cfGetVideo(uid: string): Promise<{ state: string; durationSeconds: number } | null> {
  try {
    const r = await cf(`/stream/${uid}`);
    return { state: r?.status?.state || "", durationSeconds: Math.round(r?.duration || 0) };
  } catch { return null; }
}
