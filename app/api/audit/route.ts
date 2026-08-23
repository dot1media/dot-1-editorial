import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { requireCapability } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireCapability("admin.viewAudit");
  if ("response" in gate) return gate.response;
  await ensureSchema();
  const url = new URL(request.url);
  const targetId = url.searchParams.get("targetId");
  const rows = targetId
    ? await sql`SELECT * FROM audit_log WHERE target_id = ${targetId} ORDER BY created_at DESC LIMIT 300`
    : await sql`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 300`;
  return NextResponse.json({ entries: rows });
}
