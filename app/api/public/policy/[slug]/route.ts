import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { getStandardsPage } from "@/components/public";
import { CORE_STANDARDS, CLASSIFICATIONS } from "@/lib/newsroom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, read-only policy content. This exists so the reader-facing site (news.dot1.media) can
// render the standards, corrections, ownership, advertising, and contact pages under its OWN domain
// while the editorial newsroom stays the single source of truth. The public never visits the
// editorial domain; the news backend fetches this server-side and renders it as news.dot1.media.
// Read-only and non-sensitive, so it is open (GET) with permissive CORS.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

const SLUG_MAP: Record<string, { canonical: string; lead: string }> = {
  standards: {
    canonical: "editorial-standards",
    lead: "These are the standards that govern Dot 1 News journalism. We do not claim a view from nowhere. We tell you where we stand, and we hold our reporting to the disciplines below.",
  },
  corrections: {
    canonical: "corrections",
    lead: "When we get something wrong, we fix it in the open. Every correction and clarification we issue is recorded here, newest first.",
  },
  ownership: {
    canonical: "ownership-funding",
    lead: "Who owns this newsroom and how it is funded, stated plainly.",
  },
  advertising: {
    canonical: "advertising-sponsorship",
    lead: "How we handle advertising and sponsorship, and the line between them and our reporting.",
  },
  contact: {
    canonical: "contact",
    lead: "Questions, feedback, or a correction to report? Reach the newsroom directly at contact@dot1.media.",
  },
};

async function recentCorrections() {
  const rows = await sql`
    SELECT c.kind, c.what_changed, c.why_changed, c.created_at, s.final_headline, s.working_headline
    FROM corrections c JOIN stories s ON s.id = c.story_id
    ORDER BY c.created_at DESC LIMIT 100`;
  return rows.map((r: any) => ({
    kind: r.kind,
    whatChanged: r.what_changed,
    whyChanged: r.why_changed,
    createdAt: r.created_at,
    headline: r.final_headline || r.working_headline,
  }));
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const map = SLUG_MAP[slug];
  if (!map) return NextResponse.json({ error: "Unknown policy page." }, { status: 404, headers: CORS });

  await ensureSchema();
  const page = await getStandardsPage(map.canonical);
  const extras: any = {};
  if (slug === "standards") { extras.coreStandards = CORE_STANDARDS; extras.classifications = CLASSIFICATIONS; }
  if (slug === "corrections") { extras.ledger = await recentCorrections(); }

  return NextResponse.json(
    { slug, title: page?.title || map.canonical, lead: map.lead, body: page?.body || "", extras },
    { headers: { ...CORS, "Cache-Control": "public, max-age=300" } },
  );
}
