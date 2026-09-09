"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Capability } from "@/lib/permissions";

export default function HistoryTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const id = data.story.id;
  const [revs, setRevs] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<{ revisions: any[] }>(`/api/stories/${id}/revisions`).then((d) => setRevs(d.revisions || [])).catch(() => {});
  useEffect(() => { load(); }, [id]);
  async function view(r: any) { const d = await api<{ revision: any }>(`/api/stories/${id}/revisions?rev=${r.id}`); setOpen(d.revision); }
  async function restore(r: any) {
    if (!window.confirm("Restore this version? The current text is saved as a revision first, so nothing is lost.")) return;
    setBusy(true); try { await api(`/api/stories/${id}/revisions`, { method: "POST", body: JSON.stringify({ revisionId: r.id }) }); setOpen(null); await load(); reload(); } finally { setBusy(false); }
  }
  return (
    <div className="stack">
      <div className="card pad"><label className="f">Revision history <span className="muted">(a snapshot is kept every time the headline, summary, or body changes; newest 60)</span></label>
        {revs.length === 0 ? <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>No earlier versions yet. Once the text is edited, previous versions appear here.</div> : (
          <div className="table-wrap" style={{ marginTop: 8 }}><table className="grid-t"><thead><tr><th>Saved</th><th>By</th><th>Headline then</th><th>Body</th><th></th></tr></thead><tbody>
            {revs.map((r) => (
              <tr key={r.id}>
                <td className="mono tiny">{new Date(r.created_at).toLocaleString()}{r.reason && r.reason !== "edit" ? <span className="muted"> · {r.reason}</span> : null}</td>
                <td className="tiny">{r.saved_by}</td>
                <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.final_headline || r.working_headline || <span className="muted">(untitled)</span>}</td>
                <td className="mono tiny">{r.body_len} chars</td>
                <td style={{ whiteSpace: "nowrap" }}><button className="btn" onClick={() => view(r)}>View</button> {can("story.edit") && <button className="btn" disabled={busy} onClick={() => restore(r)}>Restore</button>}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {open && (
        <div className="card pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <strong>Version from {new Date(open.created_at).toLocaleString()} · {open.saved_by}</strong>
            <div style={{ display: "flex", gap: 8 }}>{can("story.edit") && <button className="btn primary" disabled={busy} onClick={() => restore(open)}>Restore this version</button>}<button className="btn" onClick={() => setOpen(null)}>Close</button></div>
          </div>
          <div className="tiny muted">Headline</div><div style={{ fontWeight: 700, marginBottom: 8 }}>{open.final_headline || open.working_headline || "(untitled)"}</div>
          {open.summary && <><div className="tiny muted">Summary</div><div style={{ marginBottom: 8 }}>{open.summary}</div></>}
          <div className="tiny muted">Body</div><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14 }}>{open.body || <span className="muted">(empty)</span>}</div>
        </div>
      )}
    </div>
  );
}
