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
  // Which topic this run reaches for. "" means all enabled topics (balanced).
  const [only, setOnly] = useState("");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  // Create a story from a pasted YouTube video.
  const [ytUrl, setYtUrl] = useState("");
  const [ytCat, setYtCat] = useState<string>("world");
  const [ytBusy, setYtBusy] = useState(false);
  const [ytErr, setYtErr] = useState("");

  // Topics the desk reaches for, so the edition is balanced, not politics-only.
  const [topics, setTopics] = useState<{ category: string; enabled: boolean; weight: number }[]>([]);
  const [topicsBusy, setTopicsBusy] = useState(false);
  const [topicsMsg, setTopicsMsg] = useState("");
  const [topicsDirty, setTopicsDirty] = useState(false);

  async function load() {
    const d = await api<{ drafts: any[] }>("/api/ai/drafts");
    setDrafts(d.drafts || []);
    setLoaded(true);
  }
  async function loadTopics() {
    // Always show a full set of toggles. If the saved prefs can't be read yet,
    // fall back to every category on at normal pull, so the control never vanishes.
    const fallback = CATEGORIES.map((c) => ({ category: c as string, enabled: true, weight: 1 }));
    try {
      const t = await api<{ topics: any[] }>("/api/ai/topics");
      setTopics(t.topics && t.topics.length ? t.topics : fallback);
    } catch { setTopics(fallback); }
  }
  useEffect(() => { load(); if (can("story.create")) loadTopics(); }, []);

  function patchTopic(cat: string, patch: Partial<{ enabled: boolean; weight: number }>) {
    setTopics((prev) => prev.map((t) => (t.category === cat ? { ...t, ...patch } : t)));
    setTopicsDirty(true); setTopicsMsg("");
  }
  async function saveTopics() {
    setTopicsBusy(true); setTopicsMsg("");
    try {
      const r = await api<{ topics: any[] }>("/api/ai/topics", { method: "POST", body: JSON.stringify({ topics }) });
      setTopics(r.topics || topics); setTopicsDirty(false); setTopicsMsg("Saved.");
    } catch (e: any) { setTopicsMsg(e.message || "Could not save."); }
    finally { setTopicsBusy(false); }
  }

  async function generate() {
    setRunning(true); setErr(""); setResult(null);
    try {
      const r = await api<any>("/api/ai/generate", { method: "POST", body: JSON.stringify({ max, only: only || undefined }) });
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
          <label className="tiny muted">Topic</label>
          <select className="in" value={only} onChange={(e) => setOnly(e.target.value)} style={{ width: 140, textTransform: "capitalize" }} title="Reach for one topic, or all enabled topics">
            <option value="">All topics</option>
            {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c}</option>)}
          </select>
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

      {can("story.create") && topics.length > 0 && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="mini" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={14} /> TOPICS THE DESK REACHES FOR
          </div>
          <div className="tiny muted" style={{ marginBottom: 12 }}>
            Turn a topic off to skip it, or raise its pull so the desk reaches for it more. Each balanced run (Topic set to "All topics") spreads across the topics that are on, so the edition is not flooded with one beat. To pull a single beat on demand, pick it in the Topic menu by Generate now.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
            {topics.map((t) => (
              <div key={t.category} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "1px solid rgba(128,128,128,0.25)", borderRadius: 8, opacity: t.enabled ? 1 : 0.5 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer", textTransform: "capitalize" }}>
                  <input type="checkbox" checked={t.enabled} onChange={(e) => patchTopic(t.category, { enabled: e.target.checked })} />
                  {t.category}
                </label>
                <select className="in" value={[1, 2, 3].includes(t.weight) ? t.weight : 1} disabled={!t.enabled} onChange={(e) => patchTopic(t.category, { weight: Number(e.target.value) })} style={{ width: 92 }}>
                  <option value={1}>Normal</option>
                  <option value={2}>More</option>
                  <option value={3}>Most</option>
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <button className="btn primary sm" onClick={saveTopics} disabled={topicsBusy || !topicsDirty}>{topicsBusy ? "Saving…" : "Save topics"}</button>
            {topicsMsg && <span className="tiny muted">{topicsMsg}</span>}
          </div>
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
