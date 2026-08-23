import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { effectiveCapabilities } from "@/lib/permissions";

export const runtime = "nodejs";

// Who am I, and what may I do. The client uses the capability list to show/hide controls; the
// server still enforces every capability independently on each action.
export async function GET() {
  const account = await getSession();
  if (!account) return NextResponse.json({ signedIn: false }, { status: 200 });
  return NextResponse.json({
    signedIn: true,
    email: account.email,
    name: account.name,
    role: account.role,
    capabilities: Array.from(effectiveCapabilities(account.permissions)),
  });
}
