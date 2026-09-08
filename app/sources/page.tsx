"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";

const LABEL = ["", "Unreliable", "Use with caution", "Generally reliable", "Reliable", "Highly reliable"];
export function Stars({ value, onChange }: { value: number | null; onChange?: (n: number | null) => void }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} title={value ? LABEL[value] : "Not yet rated"}>
      {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" disabled={!onChange} onClick={() => onChange && onChange(value === n ? null : n)} style={{ background: "none", border: "none", padding: 0, cursor: onChange ? "pointer" : "default", color: value && n <= value ? "var(--gold, #c8a24a)" : "var(--line)", fontSize: 16, lineHeight: 1 }}>&#9733;</button>)}
    </span>
  );
}

export default function SourcesPage() {
  const { can } = useMe();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const load = () => api<{ sources: any[] }>("/api/sources").then((d) => setRows(d.sources || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  async function rate(r: any, n: number | null, note?: string) { await api("/api/sources", { method: "POST", body: JSON.stringify({ name: r.name, organization: r.organization, reliability: n, notes: note ?? r.notes }) }); load(); }
  const list = rows.filter((r) => !q || (r.name + " " + r.organization).toLowerCase().includes(q.toLowerCase()));
  const editable = can("story.edit");
  return (
    <Shell title="Sources" subtitle="Everyone the newsroom has cited, with a reliability rating and notes that follow the source across stories.">
      <div className="card" style={{ padding: 16 }}>
        <input className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sources or organizations" style={{ marginBottom: 12, maxWidth: 380 }} />
        <div className="table-wrap"><table className="grid-t">
          <thead><tr><th>Source</th><th>Organization</th><th>Stories</th><th>Types</th><th>Reliability</th><th>Notes</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.key}>
                <td style={{ fontWeight: 600 }}>{r.name}{r.offRecord > 0 && <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{r.offRecord} off-record</span>}</td>
                <td className="muted">{r.organization || "\u2014"}</td>
                <td>{r.storyCount}</td>
                <td className="muted" style={{ fontSize: 12 }}>{(r.types || []).join(", ")}</td>
                <td><Stars value={r.reliability} onChange={editable ? (n) => rate(r, n) : undefined} /> <span className="muted" style={{ fontSize: 11 }}>{r.reliability ? LABEL[r.reliability] : "unrated"}</span></td>
                <td style={{ minWidth: 220 }}>
                  {editing === r.key ? (
                    <div style={{ display: "flex", gap: 6 }}><input className="in" value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") { rate(r, r.reliability, notes); setEditing(null); } }} /><button className="btn primary" onClick={() => { rate(r, r.reliability, notes); setEditing(null); }}>Save</button></div>
                  ) : (
                    <div onClick={() => { if (editable) { setEditing(r.key); setNotes(r.notes || ""); } }} style={{ cursor: editable ? "text" : "default", fontSize: 12.5, minHeight: 18 }} className={r.notes ? "" : "muted"}>{r.notes || (editable ? "Add a note…" : "")}</div>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="muted">No sources yet. They appear here as stories cite them.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </Shell>
  );
}
