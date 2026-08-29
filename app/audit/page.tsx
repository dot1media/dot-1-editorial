"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";

export default function AuditPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await api<{ entries: any[] }>("/api/audit");
      setEntries(d.entries || []);
      setLoaded(true);
    })();
  }, []);

  return (
    <Shell title="Audit Log" subtitle="Every consequential action, timestamped and attributed.">
      {!loaded ? <span className="mono muted tiny">Loading…</span> : (
        <div className="card">
          <div className="table-wrap"><table className="grid-t">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="tiny muted" style={{ whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString()}</td>
                  <td className="tiny">{e.actor_email || "system"}</td>
                  <td><span className="chip">{e.action}</span></td>
                  <td className="tiny muted">{e.target_type}{e.target_id ? ` · ${String(e.target_id).slice(0, 14)}` : ""}</td>
                  <td className="tiny muted mono" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.detail ? JSON.stringify(e.detail) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </Shell>
  );
}
