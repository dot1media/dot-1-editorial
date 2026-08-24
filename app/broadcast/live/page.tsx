"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { Radio, Copy, Eye, EyeOff, CircleDot } from "lucide-react";

export default function LivePage() {
  const { can } = useMe();
  const mayGoLive = can("broadcast.golive");
  const [s, setS] = useState<any>(null);
  const [title, setTitle] = useState("Dot 1 News Live");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { const d = await api<any>("/api/broadcast/live"); setS(d); if (d.title) setTitle(d.title); }
    catch (e: any) { setMsg(e.message || "Could not load."); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function act(action: string, note: string) {
    setBusy(true); setMsg("");
    try { await api("/api/broadcast/live", { method: "POST", body: JSON.stringify({ action, title }) }); setMsg(note); await load(); }
    catch (e: any) { setMsg(e.message || "Action failed."); }
    finally { setBusy(false); }
  }

  function copy(v: string) { navigator.clipboard?.writeText(v); setMsg("Copied."); }

  if (!s) return <Shell title="Go Live"><span className="mono muted tiny">Loading…</span></Shell>;

  return (
    <Shell title="Go Live" subtitle="Stream the broadcast to news.dot1.media and the app.">
      {msg && <div className="tiny" style={{ marginBottom: 12, color: msg.includes("fail") || msg.includes("Could") || msg.includes("isn't") ? "#ffb4b4" : "#8fd6a8" }}>{msg}</div>}

      {/* Status banner */}
      <div className="card pad" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <CircleDot size={18} color={s.isLive ? "#e0245e" : "#8f887c"} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{s.isLive ? "ON AIR" : "Off air"}</div>
          <div className="tiny muted">{s.isLive ? (s.title || "Live") : "Nothing is streaming to readers right now."}</div>
        </div>
        {mayGoLive && s.provisioned && (
          s.isLive
            ? <button className="btn sm" style={{ background: "#e0245e", color: "#fff" }} disabled={busy} onClick={() => act("end", "Ended.")}>End broadcast</button>
            : <button className="btn primary sm" disabled={busy} onClick={() => act("golive", "You're on air.")}>Go live</button>
        )}
      </div>

      {!s.configured && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="mini" style={{ marginBottom: 8 }}>SETUP NEEDED</div>
          <div className="tiny" style={{ lineHeight: 1.6 }}>
            Cloudflare Stream isn't connected yet. A maintainer needs to set <span className="mono">CLOUDFLARE_ACCOUNT_ID</span>,
            <span className="mono"> CLOUDFLARE_STREAM_TOKEN</span> (Stream:Edit), and <span className="mono">CLOUDFLARE_STREAM_CUSTOMER_CODE</span> on
            the editorial project, then redeploy. After that, press Set up live input below.
          </div>
        </div>
      )}

      {/* Provision */}
      {s.configured && !s.provisioned && mayGoLive && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="mini" style={{ marginBottom: 8 }}>ONE-TIME SETUP</div>
          <div className="tiny muted" style={{ marginBottom: 12 }}>Create the live input Cloudflare will ingest OBS into. You only do this once; the server and key stay the same afterward.</div>
          <button className="btn primary sm" disabled={busy} onClick={() => act("provision", "Live input ready.")}>Set up live input</button>
        </div>
      )}

      {/* OBS ingest */}
      {s.obs && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="mini" style={{ marginBottom: 4 }}>OBS STREAM SETTINGS</div>
          <div className="tiny muted" style={{ marginBottom: 12 }}>In OBS: Settings → Stream → Service &ldquo;Custom&rdquo;, then paste these. Keep the stream key private.</div>
          <Field label="Server (URL)" value={s.obs.server} onCopy={() => copy(s.obs.server)} />
          <div style={{ height: 8 }} />
          <Field label="Stream key" value={showKey ? s.obs.streamKey : "•".repeat(Math.min(28, (s.obs.streamKey || "").length))}
            onCopy={() => copy(s.obs.streamKey)} extra={
              <button className="btn ghost sm" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={13} /> : <Eye size={13} />}</button>
            } />
        </div>
      )}

      {/* Title for the broadcast */}
      {mayGoLive && s.provisioned && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <label className="f">Broadcast title (shown to viewers)</label>
          <input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dot 1 News Live" />
        </div>
      )}

      {/* How it works */}
      <div className="card pad">
        <div className="mini" style={{ marginBottom: 8 }}>HOW A LIVE BROADCAST RUNS</div>
        <ol className="tiny" style={{ lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
          <li>Build your program in OBS as usual (ATEM feed + the graphics overlay).</li>
          <li>In OBS Stream settings, use the Server and Stream key above. Start Streaming.</li>
          <li>Once OBS is connected, press <b>Go live</b> here. A Live surface appears on the site and app.</li>
          <li>Push lower thirds, bug, ticker, and breaking from On-air graphics as normal.</li>
          <li>Press <b>End broadcast</b> when done. Cloudflare saves the recording, which can become a posted episode.</li>
        </ol>
        <div className="tiny muted" style={{ marginTop: 10 }}>Readers see the stream a short delay behind real time, which is normal for live video.</div>
      </div>
    </Shell>
  );
}

function Field({ label, value, onCopy, extra }: { label: string; value: string; onCopy: () => void; extra?: React.ReactNode }) {
  return (
    <div>
      <label className="f">{label}</label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input className="in mono" readOnly value={value} style={{ flex: 1, fontSize: 12 }} />
        {extra}
        <button className="btn ghost sm" onClick={onCopy}><Copy size={13} /></button>
      </div>
    </div>
  );
}
