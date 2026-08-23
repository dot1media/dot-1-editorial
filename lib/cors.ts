// Cross-origin support for public endpoints that other Dot One sites call from the browser
// (the news site and the main site submitting tips). We allow only known Dot One origins rather
// than a wildcard, so random sites cannot POST into the newsroom from a visitor's browser.

const ALLOWED_ORIGINS = new Set<string>([
  "https://dot1.media",
  "https://www.dot1.media",
  "https://news.dot1.media",
  "https://editorial.dot1.media",
]);

// Also allow Vercel preview deployments of the suite (…-dot1media.vercel.app) so staging works.
function isAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).host;
    if (host.endsWith(".vercel.app") && host.includes("dot1")) return true;
    if (host === "localhost:3000" || host.startsWith("localhost:")) return true;
  } catch {
    // ignore
  }
  return false;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const o = origin && isAllowed(origin) ? origin : "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (o) h["Access-Control-Allow-Origin"] = o;
  return h;
}
