import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { ALL_CAPABILITIES, Capability, Overrides, Role, ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

const VALID_ROLES = new Set(ROLES.map((r) => r.id));
const VALID_CAPS = new Set<Capability>(ALL_CAPABILITIES);

// Update a single account: change role, set per-capability overrides, enable/disable. Owner is
// the one role that cannot be stripped of capability; the UI reflects this and the server ignores
// override writes on owners.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("admin.manageAccounts");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);

  const rows = await sql`SELECT email, role FROM admin_accounts WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const target = rows[0];

  if (b.role !== undefined) {
    if (!VALID_ROLES.has(b.role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    await sql`UPDATE admin_accounts SET role = ${b.role} WHERE id = ${id}`;
    await audit(account.email, "account.role", "account", target.email, { role: b.role });
  }

  if (b.overrides !== undefined) {
    const clean: Overrides = {};
    for (const [k, v] of Object.entries(b.overrides || {})) {
      if (VALID_CAPS.has(k as Capability) && (v === true || v === false)) clean[k as Capability] = v;
    }
    await sql`UPDATE admin_accounts SET overrides = ${JSON.stringify(clean)} WHERE id = ${id}`;
    await audit(account.email, "account.overrides", "account", target.email, clean);
  }

  if (b.disabled !== undefined) {
    await sql`UPDATE admin_accounts SET disabled = ${!!b.disabled} WHERE id = ${id}`;
    await audit(account.email, b.disabled ? "account.disable" : "account.enable", "account", target.email);
  }

  if (b.name !== undefined) {
    await sql`UPDATE admin_accounts SET name = ${String(b.name)} WHERE id = ${id}`;
  }

  return NextResponse.json({ ok: true });
}
