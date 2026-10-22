"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { CATEGORIES } from "@/lib/newsroom";
import LensReelStudio from "@/components/LensReelStudio";
import { Sparkles, RefreshCw, ExternalLink, Youtube } from "lucide-react";

export default function AiDeskPage() {
  const { can } = useMe();
  const router = useRouter();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [max, setMax] = useState(3);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  // Create a story from a pasted YouTube video.
  const [ytUrl, setYtUrl] = useState("");
  const [ytCat, setYtCat] = useState<string>("world");
  const [ytBusy, setYtBusy] = useState(false);
  const [ytErr, setYtErr] = useState("");

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

  async function createFromYouTube() {
    const url = ytUrl.trim();
    if (!url) { setYtErr("Paste a YouTube link first."); return; }
    setYtBusy(true); setYtErr("");
    try {
      const r = await api<{ draft: { id: string; headline: string } }>("/api/ai/youtube", {
        method: "POST", body: JSON.stringify({ url, category: ytCat }),
      });
      setYtUrl("");
      router.push(`/stories/${r.draft.id}`); // open the new draft to review
    } catch (e: any) { setYtErr(e.message || "Could not create a story from that video."); }
    finally { setYtBusy(false); }
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

      {can("story.create") && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="mini" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>
            <Youtube size={14} style={{ color: "#b81616" }} /> FROM A YOUTUBE VIDEO
          </div>
          <div className="tiny muted" style={{ marginBottom: 10 }}>
            Paste a video link. The desk reads its title, description, and transcript, then writes and scores a draft grounded in what the video actually says. It lands below to verify, rate, and publish.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="in"
              placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !ytBusy) createFromYouTube(); }}
              disabled={ytBusy}
              style={{ flex: "1 1 320px", minWidth: 0 }}
            />
            <select className="in" value={ytCat} onChange={(e) => setYtCat(e.target.value)} disabled={ytBusy} style={{ width: 150 }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn primary" onClick={createFromYouTube} disabled={ytBusy}>
              {ytBusy ? <><RefreshCw size={15} className="spin" /> Writing…</> : <><Youtube size={15} /> Create story</>}
            </button>
          </div>
          {ytBusy && <div className="tiny muted" style={{ marginTop: 10 }}>Reading the video and writing the brief. This can take up to a minute.</div>}
          {ytErr && <div className="tiny" style={{ marginTop: 10, color: "#ffb4b4" }}>{ytErr}</div>}
        </div>
      )}

      {can("media.upload") && <LensReelStudio />}

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
          <div className="table-wrap"><table className="grid-t">
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
          </table></div>
        </div>
      )}
    </Shell>
  );
}
