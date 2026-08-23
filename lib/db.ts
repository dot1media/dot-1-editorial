import { neon, NeonQueryFunction } from "@neondatabase/serverless";

// Editorial has its OWN Neon database. This is where every newsroom record lives:
// story records, sources, evidence, reporting logs, verification, review checklists,
// corrections, admin accounts, roles, and the audit trail. The news database is a
// separate system we publish INTO, never the place our working data lives.
//
// IMPORTANT: connections are created lazily on first use, never at module load. Next.js evaluates
// route modules during the build ("collecting page data") when dashboard env vars may not be
// present, so throwing at import time breaks the build. Throwing only when a query actually runs
// keeps the build clean while still failing clearly at runtime if a URL is missing.

function clean(v: string | undefined | null): string {
  return String(v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

let _editorial: NeonQueryFunction<false, false> | null = null;
function editorial(): NeonQueryFunction<false, false> {
  if (_editorial) return _editorial;
  const url = clean(process.env.DATABASE_URL);
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. This is the editorial Neon database. Set it in Vercel and redeploy."
    );
  }
  _editorial = neon(url);
  return _editorial;
}

// A tagged-template proxy so callers keep writing sql`...`. It resolves the real connection on
// first call, not at import. Both the tagged-template form and any direct call form pass through.
export const sql: NeonQueryFunction<false, false> = ((...args: any[]) =>
  (editorial() as any)(...args)) as unknown as NeonQueryFunction<false, false>;

let _news: NeonQueryFunction<false, false> | null = null;
let _newsResolved = false;
function newsConn(): NeonQueryFunction<false, false> | null {
  if (_newsResolved) return _news;
  _newsResolved = true;
  const url = clean(process.env.NEWS_DATABASE_URL);
  _news = url ? neon(url) : null;
  return _news;
}

// The news database (news.dot1.media) is a SEPARATE system we publish into. Optional at boot so the
// portal still runs for editorial work if publishing is not configured yet. Publish paths call
// newsConfigured()/assertNewsConfigured() before using newsSql.
export const newsSql: NeonQueryFunction<false, false> = ((...args: any[]) => {
  const conn = newsConn();
  if (!conn) throw new Error("NEWS_DATABASE_URL is not set.");
  return (conn as any)(...args);
}) as unknown as NeonQueryFunction<false, false>;

export function newsConfigured(): boolean {
  return !!newsConn();
}

export function assertNewsConfigured(): void {
  if (!newsConfigured()) {
    throw new Error(
      "NEWS_DATABASE_URL is not set. Publishing to news.dot1.media needs the news database " +
        "pooled connection string. Add it in Vercel and redeploy."
    );
  }
}
