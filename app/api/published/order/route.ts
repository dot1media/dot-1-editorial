import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { readJson } from "@/lib/api";
import { setArticleOrder, assertNews } from "@/lib/newsArchive";
import { audit } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Arrange the published edition — which article is the lead, and the order of
 * the rest. Writes display_order into the news database; the app feed and the
 * news site both read that order (lowest = lead, with its gold dot). Setting
 * the order is a publishing action, so it requires publish.toNews.
 */
export async function POST(request: Request) {
  const gate = await requireCapability("publish.toNews");
  if ("response" in gate) return gate.response;
  const account = gate.account;

  const b = await readJson(request);
  const ids = Array.isArray(b?.order) ? b.order.map((x: any) => String(x)).filter(Boolean) : null;
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "Send an 'order' array of article ids." }, { status: 400 });
  }

  try {
    assertNews();
  } catch {
    return NextResponse.json({ error: "Publishing is not configured. NEWS_DATABASE_URL is missing." }, { status: 503 });
  }

  try {
    await setArticleOrder(ids);
    await audit(account.email, "edition.reorder", "news", ids[0], { count: ids.length, lead: ids[0] });
    return NextResponse.json({ ok: true, lead: ids[0], count: ids.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not save the order." }, { status: 503 });
  }
}
