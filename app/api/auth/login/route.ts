import { NextResponse } from "next/server";
import { makeToken, ADMIN_COOKIE, verifyPassword, adminCookieOpts, isDot1Email } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

// One admin login for the whole suite. Verifies against this app's admin_accounts (which shares
// the same email identity as the other portals) and sets the SAME signed cookie on .dot1.media,
// so signing in here also signs you into portal and assets, and vice versa. Password auth is the
// fallback for accounts that have a local hash; suite SSO means most people arrive already
// carrying a valid cookie and never hit this route.
export async function POST(request: Request) {
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Login isn't configured yet. Set SESSION_SECRET in Vercel." }, { status: 503 });
  }
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!isDot1Email(email)) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  await ensureSchema();
  const rows = await sql`SELECT password_hash, disabled FROM admin_accounts WHERE email = ${email} LIMIT 1`;
  const row = rows[0];

  // If the account exists and has a password hash, verify it. If it exists with no hash yet
  // (created via SSO bootstrap), password login is unavailable and they should use suite SSO.
  if (!row || !row.password_hash) {
    return NextResponse.json(
      { error: "This account uses Dot One single sign-on. Sign in through the main portal, then return here." },
      { status: 401 }
    );
  }
  if (row.disabled) return NextResponse.json({ error: "This account is disabled." }, { status: 403 });
  if (!verifyPassword(password, row.password_hash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await sql`UPDATE admin_accounts SET last_seen_at = now() WHERE email = ${email}`;
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(ADMIN_COOKIE, makeToken(email), adminCookieOpts(request.headers.get("host")));
  return res;
}
