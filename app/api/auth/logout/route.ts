import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_CLEAR } from "@/lib/auth";

export const runtime = "nodejs";

// Clears the shared suite cookie. Because it is set on .dot1.media, this signs the person out of
// the whole suite, which is the expected behavior for a single sign-on session.
export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", ADMIN_COOKIE_CLEAR);
  return res;
}
