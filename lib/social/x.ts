/**
 * X (formerly Twitter) posting for the social queue.
 *
 * X is a separate integration from Meta: it authenticates with OAuth 1.0a
 * (user context) and posts in two steps, upload the image to the v1.1 media
 * endpoint, then create the post with v2 /2/tweets referencing the media id.
 *
 * Auth uses four app credentials from an X developer project with Read and
 * Write access (note: write access to the X API is a paid tier):
 *   X_API_KEY, X_API_SECRET            (the app's consumer key/secret)
 *   X_ACCESS_TOKEN, X_ACCESS_SECRET    (the posting account's access token/secret)
 *
 * Nothing here logs a credential. Media upload uses multipart/form-data so the
 * image bytes are never part of the OAuth signature base string.
 */
import crypto from "crypto";

const MEDIA_UPLOAD = "https://upload.twitter.com/1.1/media/upload.json";
const TWEETS = "https://api.twitter.com/2/tweets";

export const X = {
  apiKey: process.env.X_API_KEY || "",
  apiSecret: process.env.X_API_SECRET || "",
  accessToken: process.env.X_ACCESS_TOKEN || "",
  accessSecret: process.env.X_ACCESS_SECRET || "",
  handle: (process.env.X_HANDLE || "dot1news").replace(/^@/, ""),
};

export function xConfigured(): boolean {
  return !!(X.apiKey && X.apiSecret && X.accessToken && X.accessSecret);
}

// RFC 3986 percent-encoding, which OAuth 1.0a requires (stricter than encodeURIComponent).
function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Build the OAuth 1.0a Authorization header for a request. Only the oauth_*
 * parameters and any query-string parameters are signed; a JSON or multipart
 * body is not, which is exactly what the media + tweet endpoints need.
 */
function authHeader(method: string, url: string): string {
  const u = new URL(url);
  const oauth: Record<string, string> = {
    oauth_consumer_key: X.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: X.accessToken,
    oauth_version: "1.0",
  };

  const params: Record<string, string> = { ...oauth };
  u.searchParams.forEach((v, k) => { params[k] = v; });

  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${pct(k)}=${pct(params[k])}`)
    .join("&");

  const base = [method.toUpperCase(), pct(`${u.origin}${u.pathname}`), pct(paramString)].join("&");
  const signingKey = `${pct(X.apiSecret)}&${pct(X.accessSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");

  const headerParams = { ...oauth, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${pct(k)}="${pct(headerParams[k as keyof typeof headerParams])}"`)
      .join(", ")
  );
}

function multipart(name: string, value: Buffer, filename: string, contentType: string): { body: Buffer; contentType: string } {
  const boundary = "----d1x" + crypto.randomBytes(12).toString("hex");
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    "utf8",
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return { body: Buffer.concat([head, value, tail]), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Upload image bytes to X, returning the media id to attach to a post. */
async function uploadMedia(image: Buffer, mime = "image/jpeg"): Promise<string> {
  const { body, contentType } = multipart("media", image, "card.jpg", mime);
  const res = await fetch(MEDIA_UPLOAD, {
    method: "POST",
    headers: { Authorization: authHeader("POST", MEDIA_UPLOAD), "Content-Type": contentType },
    body: new Uint8Array(body),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.media_id_string) {
    throw new Error(`media upload: ${json?.errors?.[0]?.message || json?.error || res.status}`);
  }
  return String(json.media_id_string);
}

/**
 * Post an image + text to X. Fetches the public card JPEG, uploads it, then
 * creates the post. Returns the new post id. Image is required so the post
 * carries the branded card, matching the other platforms.
 */
export async function postToX(imageUrl: string, text: string): Promise<string> {
  if (!xConfigured()) throw new Error("X is not configured (API keys missing).");

  const imgRes = await fetch(imageUrl, { cache: "no-store" });
  if (!imgRes.ok) throw new Error(`fetch card for X: ${imgRes.status}`);
  const image = Buffer.from(await imgRes.arrayBuffer());

  const mediaId = await uploadMedia(image);

  const res = await fetch(TWEETS, {
    method: "POST",
    headers: { Authorization: authHeader("POST", TWEETS), "Content-Type": "application/json" },
    body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data?.id) {
    throw new Error(`tweet: ${json?.detail || json?.errors?.[0]?.message || json?.title || res.status}`);
  }
  return String(json.data.id);
}

/** Connectivity check for the review screen. Reads the authed account; posts nothing. */
export async function xHealth(): Promise<{ ok: boolean; handle?: string; error?: string }> {
  if (!xConfigured()) return { ok: false, error: "X not configured" };
  try {
    const url = "https://api.twitter.com/2/users/me";
    const res = await fetch(url, { headers: { Authorization: authHeader("GET", url) } });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.data) return { ok: false, error: json?.detail || json?.title || `status ${res.status}` };
    return { ok: true, handle: json.data.username };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
