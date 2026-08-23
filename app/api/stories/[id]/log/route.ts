import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { newId, readJson } from "@/lib/api";

export const runtime = "nodejs";

// Add a reporting-log entry. Timestamp and author are recorded automatically; the log is
// append-only by design, so there is no edit or delete, matching a real newsroom's notebook.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("reportingLog.add");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { id } = await params;
  const b = await readJson(request);
  const entry = String(b.entry || "").trim();
  if (!entry) return NextResponse.json({ error: "Entry text required." }, { status: 400 });
  const lid = newId("log");
  await sql`INSERT INTO reporting_log (id, story_id, entry, author_email) VALUES (${lid}, ${id}, ${entry}, ${account.email})`;
  await audit(account.email, "log.add", "story", id);
  return NextResponse.json({ id: lid, ok: true });
}
