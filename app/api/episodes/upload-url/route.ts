import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { can } from "@/lib/permissions";
import { readJson } from "@/lib/api";
import { cfConfigured, cfCreateTusUpload } from "@/lib/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ask Cloudflare for a one-time resumable upload URL. The browser uploads the file directly to it.
export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  if (!can(account.permissions, "media.publish") && !can(account.permissions, "broadcast.golive"))
    return NextResponse.json({ error: "You don't have permission to publish episodes." }, { status: 403 });
  if (!cfConfigured()) return NextResponse.json({ error: "Cloudflare Stream isn't configured." }, { status: 503 });

  const b = await readJson(request);
  const size = Number(b.size) || 0;
  const name = (b.name || "episode").toString().slice(0, 120);
  if (!size || size < 1) return NextResponse.json({ error: "Missing file size." }, { status: 400 });
  const maxBytes = 15 * 1024 * 1024 * 1024; // 15 GB guardrail
  if (size > maxBytes) return NextResponse.json({ error: "File is larger than 15 GB." }, { status: 400 });

  try {
    const { uid, uploadURL } = await cfCreateTusUpload(name, size);
    return NextResponse.json({ uid, uploadURL });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not start the upload." }, { status: 502 });
  }
}
