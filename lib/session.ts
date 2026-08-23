import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { ADMIN_COOKIE, verifyToken, isDot1Email } from "@/lib/auth";
import { AccountPermissions, Capability, can, Role, Overrides } from "@/lib/permissions";

export interface SessionAccount {
  id: number;
  email: string;
  name: string;
  role: Role;
  overrides: Overrides;
  disabled: boolean;
  permissions: AccountPermissions;
}

// Resolve the signed suite cookie to an editorial account. If the email is a valid @dot1.media
// identity with a live cookie but has no editorial account row yet, we create one. The FIRST
// such account becomes an Owner (bootstrap); everyone after starts as a Viewer until an Owner
// grants more. This means a suite admin who already signed in elsewhere can reach editorial,
// but sees nothing sensitive until deliberately given a role.
export async function getSession(): Promise<SessionAccount | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const claim = verifyToken(token);
  if (!claim || !isDot1Email(claim.email)) return null;

  await ensureSchema();
  const email = claim.email.toLowerCase();

  let rows = await sql`SELECT id, email, name, role, overrides, disabled FROM admin_accounts WHERE email = ${email} LIMIT 1`;
  if (!rows.length) {
    const countRows = await sql`SELECT COUNT(*)::int AS n FROM admin_accounts`;
    const first = (countRows[0]?.n || 0) === 0;
    const role: Role = first ? "owner" : "viewer";
    rows = await sql`INSERT INTO admin_accounts (email, role) VALUES (${email}, ${role})
      ON CONFLICT (email) DO UPDATE SET last_seen_at = now()
      RETURNING id, email, name, role, overrides, disabled`;
  } else {
    await sql`UPDATE admin_accounts SET last_seen_at = now() WHERE email = ${email}`;
  }

  const r = rows[0];
  if (r.disabled) return null;
  const role = (r.role || "viewer") as Role;
  const overrides = (r.overrides || {}) as Overrides;
  return {
    id: r.id,
    email: r.email,
    name: r.name || "",
    role,
    overrides,
    disabled: !!r.disabled,
    permissions: { role, overrides },
  };
}

// Guard for API routes. Returns either the account or a ready NextResponse to return early.
export async function requireCapability(
  cap: Capability
): Promise<{ account: SessionAccount } | { response: NextResponse }> {
  const account = await getSession();
  if (!account) {
    return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  if (!can(account.permissions, cap)) {
    return { response: NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 }) };
  }
  return { account };
}

export async function requireSession(): Promise<{ account: SessionAccount } | { response: NextResponse }> {
  const account = await getSession();
  if (!account) return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  return { account };
}
