import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { newId, readJson } from "@/lib/api";
import { corsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

// Public tip submission that other Dot One sites (news.dot1.media, dot1.media) can POST to from the
// browser. CORS is scoped to Dot One origins. Two cheap spam guards: a honeypot field that real
// users never fill, and a per-IP rate limit so a bot cannot flood the newsroom. Successful tips
// land in the same tips table the newsroom triages, identical to the portal's own submit form.

// Simple in-memory rate limit. Serverless instances are ephemeral, so this is best-effort; it
// blunts bursts without needing another table. Persisted limiting can come later if abuse appears.
const hits = new Map<string, { n: number; reset: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 5;
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + windowMs });
    return false;
  }
  rec.n += 1;
  return rec.n > max;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: Request) {
  const cors = corsHeaders(request.headers.get("origin"));
  const json = (data: any, status = 200) => NextResponse.json(data, { status, headers: cors });

  const b = await readJson(request);

  // Honeypot: a hidden field named "website". Bots fill everything; humans never see it.
  if (b.website) return json({ ok: true }); // silently accept-and-drop so bots get no signal

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "Too many submissions. Please try again in a minute." }, 429);

  const body = String(b.body || "").trim();
  if (!body) return json({ error: "Please include a message." }, 400);
  if (body.length > 8000) return json({ error: "Message is too long." }, 400);

  await ensureSchema();
  const kind = b.kind === "contact" ? "contact" : "tip";
  const anonymous = !!b.anonymous;
  const id = newId("tip");
  const source = String(b.source || "").slice(0, 40); // e.g. "news-site", "main-site"

  await sql`INSERT INTO tips (id, kind, name, contact, location, subject, body, anonymous)
    VALUES (${id}, ${kind}, ${anonymous ? "" : String(b.name || "").slice(0, 200)},
      ${anonymous ? "" : String(b.contact || "").slice(0, 200)},
      ${String(b.location || "").slice(0, 200)},
      ${(source ? `[${source}] ` : "") + String(b.subject || "").slice(0, 300)},
      ${body}, ${anonymous})`;

  return json({ ok: true });
}
