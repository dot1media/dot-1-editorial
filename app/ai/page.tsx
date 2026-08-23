"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { Sparkles, RefreshCw, ExternalLink } from "lucide-react";

export default function AiDeskPage() {
  const { can } = useMe();
  const router = useRouter();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [max, setMax] = useState(3);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    const d = await api<{ drafts: any[] }>("/api/ai/drafts");
    setDrafts(d.drafts || []);
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setRunning(true); setErr(""); setResult(null);
    try {
      const r = await api<any>("/api/ai/generate", { method: "POST", body: JSON.stringify({ max }) });
      setResult(r);
      await load();
    } catch (e: any) { setErr(e.message || "Generation failed."); }
    finally { setRunning(false); }
  }

  return (
    <Shell title="AI Desk" subtitle="Generate drafts from the wire. Each lands as a story to verify, rate, and publish."
      actions={can("story.create") ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="tiny muted">Count</label>
          <input className="in" type="number" min={1} max={8} value={max} onChange={(e) => setMax(Number(e.target.value))} style={{ width: 64 }} />
          <button className="btn primary" onClick={generate} disabled={running}>
            {running ? <><RefreshCw size={15} className="spin" /> Generating…</> : <><Sparkles size={15} /> Generate now</>}
          </button>
        </div>
      ) : undefined}>

      {running && <div className="card pad tiny muted" style={{ marginBottom: 14 }}>Pulling the wire and writing drafts. This can take a minute or two; each story is a two-pass write and score.</div>}
      {err && <div className="card pad" style={{ marginBottom: 14, color: "#ffb4b4" }}>{err}</div>}
      {result && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="mini" style={{ marginBottom: 6 }}>LAST RUN</div>
          <div className="tiny">Considered {result.considered} · generated {result.generated} · skipped {result.skipped} · failed {result.failed}</div>
          {result.errors?.length > 0 && <div className="tiny muted" style={{ marginTop: 6 }}>{result.errors.slice(0, 4).join(" · ")}</div>}
        </div>
      )}

      {!loaded ? <span className="mono muted tiny">Loading…</span> : drafts.length === 0 ? (
        <div className="card pad muted tiny">No AI drafts yet. Generate now to pull from the wire.</div>
      ) : (
        <div className="card">
          <table className="grid-t">
            <thead><tr><th>Headline</th><th>Source</th><th>Review</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/stories/${d.id}`)}>
                  <td style={{ fontWeight: 600 }}>{d.final_headline || d.working_headline}</td>
                  <td className="tiny muted">{d.source_name}{d.source_url && <a href={d.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ marginLeft: 6 }}><ExternalLink size={11} /></a>}</td>
                  <td><span className="chip">{String(d.review_state || "").replace(/_/g, " ")}</span></td>
                  <td className="mono tiny">{d.scores?.totals ? (Object.values(d.scores.totals) as number[]).reduce((a, b) => a + (Number(b) || 0), 0) : "—"}</td>
                  <td className="tiny muted">open →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
