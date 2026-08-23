import type { Role } from "@/lib/permissions";

// Editorial's view of the suite identity that the portal owns. The portal decides a person's tier
// and which apps they may enter, with a baseline role per app. Editorial reads that here and uses
// the editorial role as the baseline, then applies its own per-account overrides on top.

const PORTAL_ORIGIN = process.env.SUITE_PORTAL_ORIGIN || "https://portal.dot1.media";

export interface SuiteIdentity {
  email: string;
  tier: string; // owner | admin | user
  editorialAccess: boolean;
  editorialRole: Role; // baseline role from the portal grant (owner bypass -> owner)
  disabled: boolean;
  fresh: boolean; // true if this came from a live portal check, false if from the cookie fallback
}

const VALID_ROLES: Role[] = ["owner", "editor", "reporter", "producer", "viewer"];
function asRole(v: any): Role {
  return VALID_ROLES.includes(v) ? v : "viewer";
}

// Live check against the portal, forwarding the signed cookie server-to-server (no CORS: this is a
// Node fetch, not a browser request). Returns null if the portal can't be reached or the session is
// not valid there, so the caller can fall back to the cookie claims.
export async function fetchSuiteIdentity(cookieValue: string): Promise<SuiteIdentity | null> {
  try {
    const res = await fetch(`${PORTAL_ORIGIN}/api/suite/me`, {
      headers: { cookie: `dot1_admin=${cookieValue}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.signedIn) return null;
    const ed = (d.apps || []).find((a: any) => a.id === "editorial");
    return {
      email: String(d.email || "").toLowerCase(),
      tier: d.tier || "user",
      editorialAccess: d.tier === "owner" || !!ed,
      editorialRole: d.tier === "owner" ? "owner" : asRole(ed?.role),
      disabled: false, // /api/suite/me only returns signedIn accounts that are not disabled
      fresh: true,
    };
  } catch {
    return null;
  }
}

// Fallback: read the same facts from the cookie claims the portal baked in. Used only when the live
// check fails (portal briefly unreachable), so access still resolves, just from a snapshot.
export function suiteIdentityFromClaims(email: string, tier: any, grants: any): SuiteIdentity | null {
  if (!email) return null;
  const isOwner = tier === "owner";
  const ed = grants && typeof grants === "object" ? grants.editorial : null;
  const access = isOwner || !!(ed && ed.access);
  return {
    email: email.toLowerCase(),
    tier: tier || "user",
    editorialAccess: access,
    editorialRole: isOwner ? "owner" : asRole(ed?.role),
    disabled: false,
    fresh: false,
  };
}
