import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { STANDARDS_PAGES } from "@/lib/newsroom";

export const runtime = "nodejs";

// Public: return all standards pages, seeding any that do not exist yet with empty bodies.
export async function GET() {
  await ensureSchema();
  for (const p of STANDARDS_PAGES) {
    await sql`INSERT INTO standards_pages (slug, title, body) VALUES (${p.slug}, ${p.title}, '')
      ON CONFLICT (slug) DO NOTHING`;
  }
  const rows = await sql`SELECT slug, title, body, updated_at FROM standards_pages ORDER BY slug`;
  return NextResponse.json({ pages: rows });
}
