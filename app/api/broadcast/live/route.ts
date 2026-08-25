import { NextResponse } from "next/server";
import { sql, newsSql, newsConfigured } from "@/lib/db";
import { requireCapability } from "@/lib/session";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/schema";
import { readJson } from "@/lib/api";
import { sendPushToAll } from "@/lib/push";
import {
  cfConfigured, cfCreateLiveInput, playbackUrls, ensureLiveTables, getLiveConfig, getLiveState,
} from "@/lib/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: status for the control panel. OBS ingest (server + key) is only returned to those who can go live.
export async function GET() {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureLiveTables();

  const cfg = await getLiveConfig();
  const state = await getLiveState();
  const mayGoLive = can(account.permissions, "broadcast.golive");

  return NextResponse.json({
    configured: cfConfigured(),
    newsConfigured: newsConfigured(),
    provisioned: !!cfg?.live_input_id,
    isLive: !!state?.is_live,
    title: state?.title || "",
    hls_url: state?.hls_url || "",
    player_url: state?.player_url || "",
    obs: mayGoLive && cfg?.live_input_id ? { server: cfg.rtmps_url, streamKey: cfg.stream_key } : null,
  });
}

// POST: { action: "provision" | "golive" | "end", title? }
export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.golive");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  await ensureLiveTables();
  const { action, title } = await readJson(request);

  if (action === "provision") {
    if (!cfConfigured()) return NextResponse.json({ error: "Cloudflare Stream isn't configured yet. Set the CLOUDFLARE_* env vars." }, { status: 503 });
    const existing = await getLiveConfig();
    if (existing?.live_input_id) return NextResponse.json({ ok: true, alreadyProvisioned: true });
    let input;
    try { input = await cfCreateLiveInput("Dot 1 News live"); }
    catch (e: any) { return NextResponse.json({ error: e.message || "Could not create the live input." }, { status: 502 }); }
    const urls = playbackUrls(input.uid);
    await sql`UPDATE live_config SET live_input_id = ${input.uid}, rtmps_url = ${input.rtmpsUrl},
      stream_key = ${input.streamKey}, hls_url = ${urls.hls}, dash_url = ${urls.dash}, player_url = ${urls.iframe},
      updated_at = now() WHERE id = 'current'`;
    await audit(account.email, "live.provision", "live_input", input.uid, {});
    return NextResponse.json({ ok: true, provisioned: true });
  }

  if (action === "golive") {
    if (!newsConfigured()) return NextResponse.json({ error: "News database isn't configured." }, { status: 503 });
    const cfg = await getLiveConfig();
    if (!cfg?.live_input_id) return NextResponse.json({ error: "Set up the live input first." }, { status: 400 });
    await newsSql`UPDATE live_state SET is_live = true, title = ${(title || "Dot 1 News Live").slice(0, 200)},
      hls_url = ${cfg.hls_url}, player_url = ${cfg.player_url}, started_at = now(), updated_at = now() WHERE id = 'current'`;
    await audit(account.email, "live.golive", "live_state", "current", { title });
    // Notify readers we're on air (best-effort; don't block going live)
    sendPushToAll("Dot 1 News is live", (title || "We're on air now. Tap to watch."), { type: "live" }).catch(() => {});
    return NextResponse.json({ ok: true, isLive: true });
  }

  if (action === "end") {
    if (newsConfigured()) {
      await newsSql`UPDATE live_state SET is_live = false, updated_at = now() WHERE id = 'current'`;
    }
    await audit(account.email, "live.end", "live_state", "current", {});
    return NextResponse.json({ ok: true, isLive: false });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
