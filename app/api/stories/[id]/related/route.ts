import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { rankRelated } from "@/lib/related";
export const runtime = "nodejs";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("story.view"); if ("response" in gate) return gate.response;
  await ensureSchema();
  const { id } = await params;
  const me = ((await sql`SELECT id, working_headline, final_headline, summary, category FROM stories WHERE id = ${id} LIMIT 1`) as any[])[0];
  if (!me) return NextResponse.json({ related: [] });
  const rows = (await sql`SELECT id, working_headline, final_headline, summary, status, category FROM stories WHERE status <> 'archived' AND id <> ${id} ORDER BY updated_at DESC LIMIT 600`) as any[];
  return NextResponse.json({ related: rankRelated({ id, head: me.final_headline || me.working_headline || "", sum: me.summary || "", category: me.category }, rows, 6) });
}
