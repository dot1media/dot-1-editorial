/**
 * Meta Graph API: publish a Dot 1 News post card + caption to the Dot 1 News
 * Facebook Page and the connected Instagram Business account.
 *
 * Auth: a non-expiring System User token (META_PAGE_TOKEN) assigned to the
 * Dot 1 News Page and Instagram account, with pages_manage_posts,
 * instagram_basic, and instagram_content_publish. We exchange it for the
 * Page access token and use that for both Facebook and Instagram, which is the
 * pattern Meta expects for a Page-connected IG account.
 *
 * Nothing here logs the token. Image URLs must be public JPEGs (Instagram does
 * not accept PNG), which is why the card route renders JPEG.
 */

const V = process.env.META_GRAPH_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${V}`;

export const META = {
  pageId: process.env.META_PAGE_ID || "1386966407833798",
  igUserId: process.env.META_IG_USER_ID || "17841441816733756",
  token: process.env.META_PAGE_TOKEN || "",
  handle: (process.env.META_IG_HANDLE || "dot1news").replace(/^@/, ""),
};

export type SocialTarget = "facebook" | "instagram";

export function metaConfigured(): boolean {
  return META.token.trim().length > 0;
}

async function graphGet(path: string, token: string): Promise<any> {
  const url = `${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(`Graph GET ${path.split("?")[0]}: ${json?.error?.message || res.status}`);
  }
  return json;
}

async function graphPost(path: string, params: Record<string, string>, token: string): Promise<any> {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(`Graph POST ${path}: ${json?.error?.message || res.status}`);
  }
  return json;
}

let cachedPageToken: { value: string; at: number } | null = null;

/** The Page access token, derived from the system user token. Cached briefly. */
async function pageAccessToken(): Promise<string> {
  if (cachedPageToken && Date.now() - cachedPageToken.at < 10 * 60 * 1000) {
    return cachedPageToken.value;
  }
  const j = await graphGet(`${META.pageId}?fields=access_token`, META.token);
  const tok = j.access_token || META.token;
  cachedPageToken = { value: tok, at: Date.now() };
  return tok;
}

/** Post a photo with a caption to the Dot 1 News Facebook Page. Returns the post id. */
export async function postToFacebook(imageUrl: string, caption: string): Promise<string> {
  const tok = await pageAccessToken();
  const r = await graphPost(`${META.pageId}/photos`, { url: imageUrl, caption, published: "true" }, tok);
  return String(r.post_id || r.id || "");
}

/**
 * Publish an image + caption to the connected Instagram account. Two steps:
 * create a media container, then publish it. Images only, public JPEG URL.
 */
export async function postToInstagram(imageUrl: string, caption: string): Promise<string> {
  const tok = await pageAccessToken();
  const container = await graphPost(
    `${META.igUserId}/media`,
    { image_url: imageUrl, caption },
    tok,
  );
  const creationId = String(container.id || "");
  if (!creationId) throw new Error("Instagram did not return a container id.");

  // Image containers are usually ready immediately; poll briefly to be safe.
  for (let i = 0; i < 6; i++) {
    const status = await graphGet(`${creationId}?fields=status_code`, tok).catch(() => null);
    if (!status || status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") throw new Error("Instagram failed to process the image.");
    await new Promise((r) => setTimeout(r, 1500));
  }

  const pub = await graphPost(`${META.igUserId}/media_publish`, { creation_id: creationId }, tok);
  return String(pub.id || "");
}

/** Dispatch to a target platform. Returns the platform post id. */
export async function postTo(target: SocialTarget, imageUrl: string, caption: string): Promise<string> {
  if (!metaConfigured()) throw new Error("Meta is not configured (META_PAGE_TOKEN missing).");
  return target === "facebook" ? postToFacebook(imageUrl, caption) : postToInstagram(imageUrl, caption);
}

/** Quick connectivity check used by the review screen. Does not post anything. */
export async function metaHealth(): Promise<{ ok: boolean; page?: string; ig?: string; error?: string }> {
  try {
    const tok = await pageAccessToken();
    const page = await graphGet(`${META.pageId}?fields=name`, tok);
    const ig = await graphGet(`${META.igUserId}?fields=username`, tok);
    return { ok: true, page: page.name, ig: ig.username };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
