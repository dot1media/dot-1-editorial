import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { requireCapability } from "@/lib/session";
import { metaConfigured } from "@/lib/social/meta";

export const runtime = "nodejs";

// The social queue for the review screen.
export async function GET(req: Request) {
  const gate = await requireCapability("publish.toNews");
  if ("response" in gate) return gate.response;
  await ensureSchema();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const rows = status
    ? await sql`SELECT * FROM social_posts WHERE status = ${status} ORDER BY created_at DESC LIMIT 100`
    : await sql`SELECT * FROM social_posts ORDER BY
        CASE status WHEN 'draft' THEN 0 WHEN 'approved' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'failed' THEN 3 ELSE 4 END,
        created_at DESC LIMIT 100`;

  return NextResponse.json({ posts: rows, metaConfigured: metaConfigured() });
}
