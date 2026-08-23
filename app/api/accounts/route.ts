import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { isDot1Email } from "@/lib/auth";
import { Role, ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

const VALID_ROLES = new Set(ROLES.map((r) => r.id));

export async function GET() {
  const gate = await requireCapability("admin.manageAccounts");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const rows = await sql`SELECT id, email, name, role, overrides, disabled, created_at, last_seen_at FROM admin_accounts ORDER BY email`;
  return NextResponse.json({ accounts: rows });
}

// Add an account by email. It gets a role now; the person signs in via suite SSO. No password is
// set here (SSO handles identity); a password hash only exists for legacy password logins.
export async function POST(request: Request) {
  const gate = await requireCapability("admin.manageAccounts");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const b = await readJson(request);
  const email = String(b.email || "").trim().toLowerCase();
  const role = (b.role || "viewer") as Role;
  if (!isDot1Email(email)) return NextResponse.json({ error: "Email must be a @dot1.media address." }, { status: 400 });
  if (!VALID_ROLES.has(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  await sql`INSERT INTO admin_accounts (email, name, role) VALUES (${email}, ${b.name || ""}, ${role})
    ON CONFLICT (email) DO UPDATE SET role = ${role}, name = COALESCE(NULLIF(${b.name || ""}, ''), admin_accounts.name)`;
  await audit(account.email, "account.upsert", "account", email, { role });
  return NextResponse.json({ ok: true });
}
