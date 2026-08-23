"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { Capability } from "@/lib/permissions";

export default function LogTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const addable = can("reportingLog.add");
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!entry.trim()) return;
    setBusy(true);
    try {
      await api(`/api/stories/${data.story.id}/log`, { method: "POST", body: JSON.stringify({ entry }) });
      setEntry("");
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {addable && (
        <div className="card pad">
          <label className="f">Add a reporting note <span className="muted">(timestamp and your name are recorded automatically)</span></label>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="in" value={entry} onChange={(e) => setEntry(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Contacted Wasilla PD PIO…" />
            <button className="btn primary" onClick={add} disabled={busy}>Log</button>
          </div>
        </div>
      )}

      <div className="card pad">
        {data.log.length === 0 ? (
          <div className="muted tiny">No entries yet.</div>
        ) : (
          data.log.map((l: any) => (
            <div key={l.id} className="logent">
              <div className="ts">{new Date(l.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              <div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{l.entry}</div>
                <div className="who">{l.author_email}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
