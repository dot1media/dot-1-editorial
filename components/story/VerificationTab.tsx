"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { CLAIM_STATES } from "@/lib/newsroom";
import { ClaimPill } from "@/components/ui";
import type { Capability } from "@/lib/permissions";
import { Plus, Trash2 } from "lucide-react";

export default function VerificationTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const manage = can("verification.manage");
  const [claim, setClaim] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!claim.trim()) return;
    await api(`/api/stories/${data.story.id}/claims`, { method: "POST", body: JSON.stringify({ claim }) });
    setClaim("");
    setAdding(false);
    reload();
  }
  async function setStatus(cid: string, status: string) {
    await api(`/api/stories/${data.story.id}/claims`, { method: "PATCH", body: JSON.stringify({ id: cid, status }) });
    reload();
  }
  async function setSources(cid: string, sources: string) {
    await api(`/api/stories/${data.story.id}/claims`, { method: "PATCH", body: JSON.stringify({ id: cid, sources }) });
    reload();
  }
  async function del(cid: string) {
    await api(`/api/stories/${data.story.id}/claims?cid=${cid}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="stack">
      <div className="card pad tiny muted" style={{ lineHeight: 1.5 }}>
        Track each consequential claim on its own. This is how the newsroom tells what it knows from what it has merely heard.
      </div>

      {data.claims.map((c: any) => (
        <div key={c.id} className="card pad">
          <div className="row-between">
            <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>&ldquo;{c.claim}&rdquo;</div>
            {manage && <button className="btn ghost sm" onClick={() => del(c.id)}><Trash2 size={13} /></button>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            {manage ? (
              CLAIM_STATES.map((st) => (
                <button key={st.id} onClick={() => setStatus(c.id, st.id)} className={"btn sm " + (c.status === st.id ? "gold" : "ghost")}>{st.label}</button>
              ))
            ) : (
              <ClaimPill status={c.status} />
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="f">Sources supporting this</label>
            {manage ? (
              <input className="in" defaultValue={c.sources} onBlur={(e) => e.target.value !== c.sources && setSources(c.id, e.target.value)} placeholder="Wasilla Fire Dept + incident report" />
            ) : (
              <div className="tiny muted">{c.sources || "none recorded"}</div>
            )}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="card pad stack">
          <div><label className="f">Claim</label><input className="in" value={claim} onChange={(e) => setClaim(e.target.value)} autoFocus placeholder="Three buildings were damaged." onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={add}>Add claim</button>
          </div>
        </div>
      ) : manage ? (
        <button className="btn ghost" onClick={() => setAdding(true)} style={{ alignSelf: "flex-start" }}><Plus size={15} /> Track a claim</button>
      ) : null}
    </div>
  );
}
