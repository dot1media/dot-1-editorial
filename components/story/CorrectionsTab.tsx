"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { Capability } from "@/lib/permissions";

export default function CorrectionsTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const manage = can("corrections.manage");
  const [kind, setKind] = useState("correction");
  const [what, setWhat] = useState("");
  const [why, setWhy] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!what.trim()) return;
    setBusy(true);
    try {
      await api(`/api/stories/${data.story.id}/corrections`, { method: "POST", body: JSON.stringify({ kind, whatChanged: what, whyChanged: why }) });
      setWhat(""); setWhy(""); setAdding(false);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="card pad tiny muted" style={{ lineHeight: 1.5 }}>
        Corrections are never silent and never erased. Each one is a permanent record of what changed, why, and who authorized it. If the story is live, the correction re-syncs the published version.
      </div>

      {data.corrections.map((c: any) => (
        <div key={c.id} className="card pad">
          <div className="row-between">
            <span className={"chip" + (c.kind === "correction" ? " crimson" : " gold")}>{c.kind}</span>
            <span className="tiny muted">{new Date(c.created_at).toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 14, marginTop: 10, fontWeight: 600 }}>{c.what_changed}</div>
          {c.why_changed && <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>Why: {c.why_changed}</div>}
          <div className="tiny muted" style={{ marginTop: 8 }}>Authorized by {c.authorized_by}</div>
        </div>
      ))}

      {adding ? (
        <div className="card pad stack">
          <div><label className="f">Type</label>
            <select className="in" value={kind} onChange={(e) => setKind(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="correction">Correction (factual error)</option>
              <option value="update">Update (new information)</option>
            </select>
          </div>
          <div><label className="f">What changed</label><textarea className="in" value={what} onChange={(e) => setWhat(e.target.value)} style={{ minHeight: 56 }} autoFocus /></div>
          <div><label className="f">Why it changed</label><textarea className="in" value={why} onChange={(e) => setWhy(e.target.value)} style={{ minHeight: 48 }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={add} disabled={busy}>Record</button>
          </div>
        </div>
      ) : manage ? (
        <button className="btn ghost" onClick={() => setAdding(true)} style={{ alignSelf: "flex-start" }}>Record a correction</button>
      ) : null}
    </div>
  );
}
