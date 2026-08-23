"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { EVIDENCE_KINDS } from "@/lib/newsroom";
import type { Capability } from "@/lib/permissions";
import { Plus, Trash2, ExternalLink } from "lucide-react";

export default function EvidenceTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const manage = can("evidence.manage");
  const [f, setF] = useState({ kind: "document", label: "", url: "", notes: "" });
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!f.label.trim() && !f.url.trim()) return;
    await api(`/api/stories/${data.story.id}/evidence`, { method: "POST", body: JSON.stringify(f) });
    setF({ kind: "document", label: "", url: "", notes: "" });
    setAdding(false);
    reload();
  }
  async function del(eid: string) {
    await api(`/api/stories/${data.story.id}/evidence?eid=${eid}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="stack">
      {data.evidence.length === 0 && !adding && <div className="card pad muted tiny">No evidence attached. Documentation supports significant reporting.</div>}
      {data.evidence.map((ev: any) => (
        <div key={ev.id} className="card pad row-between">
          <div>
            <div style={{ fontWeight: 600 }}>{ev.label || ev.url}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
              <span className="chip">{ev.kind.replace(/_/g, " ")}</span>
              {ev.url && <a className="tiny" href={ev.url} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 4 }}>open <ExternalLink size={11} /></a>}
              <span className="tiny muted">· {ev.added_by}</span>
            </div>
            {ev.notes && <div className="tiny muted" style={{ marginTop: 6 }}>{ev.notes}</div>}
          </div>
          {manage && <button className="btn ghost sm" onClick={() => del(ev.id)}><Trash2 size={13} /></button>}
        </div>
      ))}

      {adding ? (
        <div className="card pad stack">
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
            <div><label className="f">Kind</label><select className="in" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{EVIDENCE_KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}</select></div>
            <div><label className="f">Label</label><input className="in" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} autoFocus /></div>
          </div>
          <div><label className="f">URL</label><input className="in" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" /></div>
          <div><label className="f">Notes</label><textarea className="in" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} style={{ minHeight: 48 }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn primary" onClick={add}>Attach</button>
          </div>
        </div>
      ) : manage ? (
        <button className="btn ghost" onClick={() => setAdding(true)} style={{ alignSelf: "flex-start" }}><Plus size={15} /> Attach evidence</button>
      ) : null}
    </div>
  );
}
