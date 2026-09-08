"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Capability } from "@/lib/permissions";

export default function DiscussionTab({ data, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const id = data.story.id;
  const [items, setItems] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const load = () => api<{ discussion: any[] }>(`/api/stories/${id}/discussion`).then((d) => setItems(d.discussion || [])).catch(() => {});
  useEffect(() => { load(); }, [id]);
  async function add() {
    const text = body.trim(); if (!text || busy) return;
    setBusy(true);
    try { await api(`/api/stories/${id}/discussion`, { method: "POST", body: JSON.stringify({ body: text }) }); setBody(""); await load(); } finally { setBusy(false); }
  }
  async function toggle(c: any) { await api(`/api/stories/${id}/discussion`, { method: "PATCH", body: JSON.stringify({ id: c.id, resolved: !c.resolved }) }); load(); }
  const open = items.filter((c) => !c.resolved), resolved = items.filter((c) => c.resolved);
  return (
    <div className="stack">
      <div className="card pad">
        <label className="f">Discussion <span className="muted">(internal only; never published, separate from the reporting log)</span></label>
        <textarea className="in" rows={3} value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add(); }} placeholder="Ask a question, flag a concern, or leave a note for the desk. Cmd/Ctrl+Enter to post." />
        <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
          <button className="btn primary" onClick={add} disabled={busy || !body.trim()}>Post</button>
          {resolved.length > 0 && <button className="btn" onClick={() => setShowResolved((v) => !v)}>{showResolved ? "Hide" : "Show"} {resolved.length} resolved</button>}
        </div>
      </div>
      {open.length === 0 && !showResolved && <div className="muted" style={{ fontSize: 13 }}>No open discussion. Start one above.</div>}
      {[...open, ...(showResolved ? resolved : [])].map((c) => (
        <div key={c.id} className="card pad" style={{ opacity: c.resolved ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <div><strong>{c.author_name || c.author_email}</strong> <span className="muted" style={{ fontSize: 12 }}>{new Date(c.created_at).toLocaleString()}</span></div>
            <button className="btn" style={{ fontSize: 12 }} onClick={() => toggle(c)}>{c.resolved ? "Reopen" : "Resolve"}</button>
          </div>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 6, lineHeight: 1.55 }}>{c.body}</div>
        </div>
      ))}
    </div>
  );
}
