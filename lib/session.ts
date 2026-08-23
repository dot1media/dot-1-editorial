import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { ADMIN_COOKIE, verifyToken, isDot1Email } from "@/lib/auth";
import { AccountPermissions, Capability, can, Role, Overrides } from "@/lib/permissions";
import { fetchSuiteIdentity, suiteIdentityFromClaims, type SuiteIdentity } from "@/lib/suite";

export interface SessionAccount {
  id: number;
  email: string;
  name: string;
  role: Role;
  overrides: Overrides;
  disabled: boolean;
  permissions: AccountPermissions;
  suiteTier: string;
  roleFromSuite: boolean;
}

// Resolve the signed suite cookie to an editorial account.
//
// The portal is the source of truth for a person's baseline role and whether they may enter
// editorial at all. We resolve that identity here (a live portal check first, the cookie's baked
// claims as fallback), gate access on it, and use the portal's editorial role as the baseline.
// Editorial then applies its OWN per-account overrides on top, so a role set centrally can still be
// fine-tuned locally. A person the portal has not granted editorial access to gets no session, and
// a disabled account is locked out on their next request, not at cookie expiry.
export async function getSession(): Promise<SessionAccount | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const claim = verifyToken(token);
  if (!claim || !isDot1Email(claim.email)) return null;

  await ensureSchema();
  const email = claim.email.toLowerCase();

  // Portal identity: live check, then cookie-claims fallback.
  let suite: SuiteIdentity | null = token ? await fetchSuiteIdentity(token) : null;
  if (!suite) suite = suiteIdentityFromClaims(email, (claim as any).tier, (claim as any).grants);

  // If the portal spoke (fresh or via claims) and says no editorial access, deny. When the portal
  // says nothing at all (old cookie with no claims AND portal unreachable), fall back to editorial's
  // own stored role so an established newsroom is never locked out by a transient portal outage.
  if (suite && !suite.editorialAccess) return null;

  let rows = await sql`SELECT id, email, name, role, overrides, disabled FROM admin_accounts WHERE email = ${email} LIMIT 1`;
  if (!rows.length) {
    // First-time editorial visitor. Seed their row with the portal baseline role if we have it, else
    // the legacy bootstrap (first ever account = owner) so a brand-new install still works.
    let seedRole: Role;
    if (suite) {
      seedRole = suite.editorialRole;
    } else {
      const countRows = await sql`SELECT COUNT(*)::int AS n FROM admin_accounts`;
      seedRole = (countRows[0]?.n || 0) === 0 ? "owner" : "viewer";
    }
    rows = await sql`INSERT INTO admin_accounts (email, role) VALUES (${email}, ${seedRole})
      ON CONFLICT (email) DO UPDATE SET last_seen_at = now()
      RETURNING id, email, name, role, overrides, disabled`;
  } else {
    await sql`UPDATE admin_accounts SET last_seen_at = now() WHERE email = ${email}`;
  }

  const r = rows[0];
  if (r.disabled) return null;

  // Baseline role: the portal's when we have it (cached back into editorial so the accounts page can
  // show it), otherwise editorial's own stored role.
  let role: Role;
  let roleFromSuite = false;
  if (suite) {
    role = suite.editorialRole;
    roleFromSuite = true;
    if (r.role !== role) await sql`UPDATE admin_accounts SET role = ${role} WHERE id = ${r.id}`;
  } else {
    role = (r.role || "viewer") as Role;
  }

  const overrides = (r.overrides || {}) as Overrides;
  return {
    id: r.id,
    email: r.email,
    name: r.name || "",
    role,
    overrides,
    disabled: !!r.disabled,
    permissions: { role, overrides },
    suiteTier: suite?.tier || "user",
    roleFromSuite,
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
