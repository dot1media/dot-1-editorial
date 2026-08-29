import crypto from "crypto";

// SSO for the whole Dot One suite. The admin cookie is signed with SESSION_SECRET and set on
// the parent domain .dot1.media, so a single sign-in at any suite app (portal, assets, editorial)
// is recognized by all of them. This file mirrors the portal's scheme exactly, byte for byte,
// so the tokens are interchangeable: same cookie name, same HMAC-SHA256 over a base64url body,
// same one-week expiry, same role claim. Do not diverge from it without changing every app.

export const ADMIN_COOKIE = "dot1_admin";
const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function sign(payloadObj: object): string {
  const secret = process.env.SESSION_SECRET || "";
  const body = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + sig;
}

function verify(token: string | undefined | null, role: string): { email: string; tier?: string; grants?: any } | null {
  const secret = process.env.SESSION_SECRET || "";
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const e = Buffer.from(expected);
  if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.role !== role || typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    const floor = Number(process.env.SESSION_MIN_IAT || 0);
    if (floor && (typeof payload.iat !== "number" || payload.iat < floor)) return null;
    // The portal bakes suite claims (tier + per-app grants) into the cookie. We read them as a
    // fast fallback for when the portal can't be reached for a fresh check.
    return { email: String(payload.email || ""), tier: payload.tier, grants: payload.grants };
  } catch {
    return null;
  }
}

export function makeToken(email: string): string {
  return sign({ role: "admin", email, exp: Date.now() + WEEK_MS });
}
export function verifyToken(token: string | undefined | null) {
  return verify(token, "admin");
}

// Restrict suite identity to @dot1.media, same rule the portal enforces.
export function isDot1Email(email: string): boolean {
  return /^[^@\s]+@dot1\.media$/i.test(String(email || "").trim());
}

// Cookie is shared across *.dot1.media in production; on previews/localhost the domain is
// omitted so it still works there. Identical to the portal's adminCookieOpts.
export function adminCookieOpts(host: string | null | undefined) {
  const h = String(host || "").toLowerCase().split(":")[0];
  const shared = h === "dot1.media" || h.endsWith(".dot1.media");
  const base = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };
  return shared ? { ...base, domain: ".dot1.media" } : base;
}
export const ADMIN_COOKIE_CLEAR = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  domain: ".dot1.media",
  maxAge: 0,
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return "scrypt$" + salt + "$" + hash;
}
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const test = crypto.scryptSync(password, parts[1], 64).toString("hex");
  const a = Buffer.from(parts[2], "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
