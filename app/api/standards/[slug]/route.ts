import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema, audit } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureSchema();
  const { slug } = await params;
  const rows = await sql`SELECT slug, title, body, updated_at, updated_by FROM standards_pages WHERE slug = ${slug} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ page: rows[0] });
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const gate = await requireCapability("standards.edit");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureSchema();
  const { slug } = await params;
  const b = await readJson(request);
  await sql`INSERT INTO standards_pages (slug, title, body, updated_by, updated_at)
    VALUES (${slug}, ${b.title || slug}, ${b.body || ""}, ${account.email}, now())
    ON CONFLICT (slug) DO UPDATE SET title = ${b.title || slug}, body = ${b.body || ""}, updated_by = ${account.email}, updated_at = now()`;
  await audit(account.email, "standards.edit", "standards", slug);
  return NextResponse.json({ ok: true });
}
