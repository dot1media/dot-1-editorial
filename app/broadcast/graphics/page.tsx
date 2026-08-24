"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { Radio, RadioTower } from "lucide-react";

// On-Air Graphics: drives the logo bug, ticker, and breaking banner on the OBS output through the
// broadcast bus. Lower thirds are taken per-segment from the rundown; these are the show-wide
// elements. Every toggle posts to the bus and the overlay picks it up within a second.

export default function GraphicsPage() {
  const { can } = useMe();
  const manage = can("broadcast.manage");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [bug, setBug] = useState({ on: false, color: "white", live: false });
  const [ticker, setTicker] = useState({ on: false, headlines: "", label: "Latest" });
  const [breaking, setBreaking] = useState({ on: false, text: "" });

  const load = useCallback(async () => {
    try {
      const d = await api<any>("/api/broadcast/bus");
      if (d.bug) setBug(d.bug);
      if (d.ticker) setTicker(d.ticker);
      if (d.breaking) setBreaking(d.breaking);
    } catch { /* first load may be empty */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function push(patch: any, note: string) {
    setBusy(true); setMsg("");
    try { await api("/api/broadcast/bus", { method: "POST", body: JSON.stringify(patch) }); setMsg(note); }
    catch (e: any) { setMsg(e.message || "Could not reach the overlay."); }
    finally { setBusy(false); }
  }

  return (
    <Shell title="On-Air Graphics" subtitle="Drive the bug, ticker, and breaking banner straight to the OBS output.">
      {!manage && <div className="card pad muted tiny" style={{ marginBottom: 16 }}>You can view the current state, but changing what's on air needs broadcast permissions.</div>}
      {msg && <div className="tiny" style={{ marginBottom: 12, color: msg.startsWith("On air") || msg.startsWith("Updated") || msg.startsWith("Cleared") ? "#8fd6a8" : "#ffb4b4" }}>{msg}</div>}

      {/* Logo bug */}
      <div className="card pad stack" style={{ marginBottom: 16 }}>
        <div className="row-between">
          <div className="mini">LOGO BUG</div>
          <span className={"chip" + (bug.on ? " ok" : "")}>{bug.on ? "On air" : "Off"}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label className="tiny muted">Color</label>
          <select className="in" style={{ width: 120 }} value={bug.color} disabled={!manage}
            onChange={(e) => setBug({ ...bug, color: e.target.value })}>
            <option value="white">White</option><option value="red">Red</option><option value="black">Black</option>
          </select>
          <label className="tiny" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={bug.live} disabled={!manage} onChange={(e) => setBug({ ...bug, live: e.target.checked })} /> LIVE dot
          </label>
          <div style={{ flex: 1 }} />
          {manage && <>
            <button className="btn gold sm" disabled={busy} onClick={() => { const n = { ...bug, on: true }; setBug(n); push({ bug: n }, "On air: bug"); }}>Show</button>
            <button className="btn ghost sm" disabled={busy} onClick={() => { const n = { ...bug, on: false }; setBug(n); push({ bug: n }, "Cleared: bug"); }}>Hide</button>
          </>}
        </div>
      </div>

      {/* Ticker */}
      <div className="card pad stack" style={{ marginBottom: 16 }}>
        <div className="row-between">
          <div className="mini">TICKER</div>
          <span className={"chip" + (ticker.on ? " ok" : "")}>{ticker.on ? "On air" : "Off"}</span>
        </div>
        <div><label className="f">Headlines (separate with | )</label>
          <textarea className="in" value={ticker.headlines} disabled={!manage}
            onChange={(e) => setTicker({ ...ticker, headlines: e.target.value })}
            placeholder="Borough assembly approves budget|Salmon run tops five-year average" style={{ minHeight: 60 }} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label className="tiny muted">Label</label>
          <input className="in" style={{ width: 140 }} value={ticker.label} disabled={!manage} onChange={(e) => setTicker({ ...ticker, label: e.target.value })} />
          <div style={{ flex: 1 }} />
          {manage && <>
            <button className="btn gold sm" disabled={busy} onClick={() => { const n = { ...ticker, on: true }; setTicker(n); push({ ticker: n }, "On air: ticker"); }}>Show</button>
            <button className="btn ghost sm" disabled={busy} onClick={() => { const n = { ...ticker, on: false }; setTicker(n); push({ ticker: n }, "Cleared: ticker"); }}>Hide</button>
            {ticker.on && <button className="btn ghost sm" disabled={busy} onClick={() => push({ ticker: { ...ticker, on: true } }, "Updated ticker")}>Update text</button>}
          </>}
        </div>
      </div>

      {/* Breaking */}
      <div className="card pad stack">
        <div className="row-between">
          <div className="mini">BREAKING BANNER</div>
          <span className={"chip" + (breaking.on ? " ok" : "")}>{breaking.on ? "On air" : "Off"}</span>
        </div>
        <div><label className="f">Breaking headline</label>
          <input className="in" value={breaking.text} disabled={!manage} onChange={(e) => setBreaking({ ...breaking, text: e.target.value })} placeholder="Live from the Mat-Su Valley" />
        </div>
        {manage && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn gold sm" disabled={busy} onClick={() => { const n = { ...breaking, on: true }; setBreaking(n); push({ breaking: n }, "On air: breaking"); }}>Show</button>
          <button className="btn ghost sm" disabled={busy} onClick={() => { const n = { ...breaking, on: false }; setBreaking(n); push({ breaking: n }, "Cleared: breaking"); }}>Hide</button>
        </div>}
      </div>

      <div className="tiny muted" style={{ marginTop: 16, lineHeight: 1.5 }}>
        These push to the live OBS output through the broadcast bus. Lower thirds are taken per-segment from a rundown. Point an OBS browser source at the overlay output to see them.
      </div>
    </Shell>
  );
}
