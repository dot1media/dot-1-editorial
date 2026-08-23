import crypto from "crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { makeToken, ADMIN_COOKIE, hashPassword, adminCookieOpts, isDot1Email } from "@/lib/auth";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Create OR reset an editorial account, authorized by the studio master password (ADMIN_PASSWORD,
// the same secret the main portal uses). This is first-run setup and a break-glass recovery if SSO
// is not carrying yet or an admin is locked out. On success it also sets the shared .dot1.media
// cookie, so it signs you into the whole suite. The first account created becomes Owner.
export async function POST(request: Request) {
  if (!process.env.SESSION_SECRET) return NextResponse.json({ error: "Not configured (SESSION_SECRET)." }, { status: 503 });
  await ensureSchema();

  const b = await readJson(request);
  const email = String(b.email || "").trim().toLowerCase();
  const name = String(b.name || "").trim();
  const password = String(b.password || "");
  const setupCode = String(b.setupCode || "");

  const gate = process.env.ADMIN_PASSWORD || "";
  if (!gate) return NextResponse.json({ error: "ADMIN_PASSWORD is not set, so setup can't be authorized." }, { status: 503 });
  if (!setupCode || !safeEqual(setupCode, gate)) return NextResponse.json({ error: "That studio master password is incorrect." }, { status: 403 });
  if (!isDot1Email(email)) return NextResponse.json({ error: "Admin email must be a @dot1.media address." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Choose a password of at least 8 characters." }, { status: 400 });

  // First account becomes Owner; later setups keep their existing role (or default to owner if none).
  const countRows = await sql`SELECT COUNT(*)::int AS n FROM admin_accounts`;
  const first = (countRows[0]?.n || 0) === 0;
  if (first) {
    await sql`INSERT INTO admin_accounts (email, name, password_hash, role) VALUES (${email}, ${name}, ${hashPassword(password)}, 'owner')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'owner'`;
  } else {
    await sql`INSERT INTO admin_accounts (email, name, password_hash, role) VALUES (${email}, ${name}, ${hashPassword(password)}, 'owner')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash`;
  }

  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(ADMIN_COOKIE, makeToken(email), adminCookieOpts(request.headers.get("host")));
  return res;
}

// Tells the login screen whether any editorial account exists yet.
export async function GET() {
  const configured = !!process.env.SESSION_SECRET;
  try {
    await ensureSchema();
    const rows = await sql`SELECT COUNT(*)::int AS n FROM admin_accounts`;
    return NextResponse.json({ configured, needsSetup: (rows[0]?.n || 0) === 0 });
  } catch (e: any) {
    return NextResponse.json({ configured, needsSetup: false, error: String(e?.message || e) });
  }
}
