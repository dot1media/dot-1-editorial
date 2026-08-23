import { neon } from "@neondatabase/serverless";

// Editorial has its OWN Neon database. This is where every newsroom record lives:
// story records, sources, evidence, reporting logs, verification, review checklists,
// corrections, admin accounts, roles, and the audit trail. The news database is a
// separate system we publish INTO, never the place our working data lives.
function clean(v: string | undefined | null): string {
  return String(v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

const editorialUrl = clean(process.env.DATABASE_URL);
if (!editorialUrl) {
  throw new Error(
    "DATABASE_URL is not set. This is the editorial Neon database. " +
      "Run `npx vercel env pull .env.local --environment=production` or set it in Vercel."
  );
}

// Editorial's own database. Tagged-template values are parameterized, safe from injection.
export const sql = neon(editorialUrl);

// The news database (news.dot1.media) is a SEPARATE system we publish into. Its connection
// string is optional at boot so the portal still runs for editorial work even if publishing
// is not configured yet; publish paths check newsConfigured() and fail clearly if missing.
const newsUrl = clean(process.env.NEWS_DATABASE_URL);
export const newsSql = newsUrl ? neon(newsUrl) : null;

export function newsConfigured(): boolean {
  return !!newsUrl;
}

export function assertNewsConfigured(): void {
  if (!newsSql) {
    throw new Error(
      "NEWS_DATABASE_URL is not set. Publishing to news.dot1.media needs the news database " +
        "pooled connection string. Add it in Vercel and redeploy."
    );
  }
}
