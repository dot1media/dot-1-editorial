"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { SOURCE_TYPES, SOURCE_TYPE_LABELS, ATTRIBUTIONS, RESPONSE_STATES } from "@/lib/newsroom";
import type { Capability } from "@/lib/permissions";
import { Plus, Trash2 } from "lucide-react";

const BLANK = { name: "", organization: "", title: "", contact: "", sourceType: "interview", attribution: "on_record", responseStatus: "pending", notes: "", reliabilityNotes: "" };

export default function SourcesTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const manage = can("sources.manage");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ ...BLANK });

  async function add() {
    if (!f.name.trim() && !f.organization.trim()) return;
    await api(`/api/stories/${data.story.id}/sources`, { method: "POST", body: JSON.stringify(f) });
    setF({ ...BLANK });
    setAdding(false);
    reload();
  }
  async function del(sid: string) {
    await api(`/api/stories/${data.story.id}/sources?sid=${sid}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="stack">
      {data.sources.length === 0 && !adding && <div className="card pad muted tiny">No sources yet. Every consequential claim should trace to one.</div>}

      {data.sources.map((src: any) => (
        <div key={src.id} className="card pad">
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{src.name || "(unnamed)"}{src.title && <span className="muted" style={{ fontWeight: 400 }}> · {src.title}</span>}</div>
              {src.organization && <div className="tiny muted">{src.organization}</div>}
            </div>
            {manage && <button className="btn ghost sm" onClick={() => del(src.id)}><Trash2 size={13} /></button>}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <span className="chip">{SOURCE_TYPE_LABELS[src.source_type] || src.source_type}</span>
            <span className={"chip" + (src.attribution === "anonymous" ? " crimson" : "")}>{src.attribution.replace("_", " ")}</span>
            <span className={"chip" + (src.response_status === "responded" ? " ok" : "")}>{src.response_status.replace("_", " ")}</span>
          </div>
          {src.contact && <div className="tiny muted" style={{ marginTop: 8 }}>Contact: {src.contact}</div>}
          {src.notes && <div className="tiny" style={{ marginTop: 8, lineHeight: 1.5 }}>{src.notes}</div>}
          {src.reliability_notes && <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>Reliability: {src.reliability_notes}</div>}
        </div>
      ))}

      {adding ? (
        <div className="card pad stack">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="f">Name</label><input className="in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
            <div><label className="f">Organization</label><input className="in" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></div>
            <div><label className="f">Position / title</label><input className="in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><label className="f">Contact</label><input className="in" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label className="f">Type</label><select className="in" value={f.sourceType} onChange={(e) => setF({ ...f, sourceType: e.target.value })}>{SOURCE_TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>)}</select></div>
            <div><label className="f">Attribution</label><select className="in" value={f.attribution} onChange={(e) => setF({ ...f, attribution: e.target.value })}>{ATTRIBUTIONS.map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}</select></div>
            <div><label className="f">Response</label><select className="in" value={f.responseStatus} onChange={(e) => setF({ ...f, responseStatus: e.target.value })}>{RESPONSE_STATES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select></div>
          </div>
          <div><label className="f">Notes</label><textarea className="in" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} style={{ minHeight: 56 }} /></div>
          <div><label className="f">Reliability / verification notes</label><textarea className="in" value={f.reliabilityNotes} onChange={(e) => setF({ ...f, reliabilityNotes: e.target.value })} style={{ minHeight: 48 }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => { setAdding(false); setF({ ...BLANK }); }}>Cancel</button>
            <button className="btn primary" onClick={add}>Add source</button>
          </div>
        </div>
      ) : manage ? (
        <button className="btn ghost" onClick={() => setAdding(true)} style={{ alignSelf: "flex-start" }}><Plus size={15} /> Add source</button>
      ) : null}
    </div>
  );
}
