"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { PHOTO_CATEGORIES, VIDEO_CATEGORIES } from "@/lib/newsroom";
import { Image as ImageIcon, Film, Search, RefreshCw, Check, ExternalLink, Link2 } from "lucide-react";

type Kind = "photo" | "video";
interface Candidate {
  provider: string; url: string; thumbnail: string; creator: string; creditUrl: string;
  license: string; source: string; title: string; width: number | null; height: number | null; durationSeconds: number | null;
}

// AI desk: find license-clear media (or paste a URL) and post it to the news app's
// Lens (photos) or Reel (videos), always with a creator credit and a credit link.
export default function LensReelStudio() {
  const [kind, setKind] = useState<Kind>("photo");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [manual, setManual] = useState(false);

  // selection / form
  const [sel, setSel] = useState<Candidate | null>(null);
  const [url, setUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [credit, setCredit] = useState("");
  const [creditUrl, setCreditUrl] = useState("");
  const [meta, setMeta] = useState<{ width: number | null; height: number | null; durationSeconds: number | null }>({ width: null, height: null, durationSeconds: null });

  const [publishing, setPublishing] = useState(false);
  const [pubErr, setPubErr] = useState("");
  const [done, setDone] = useState<{ kind: Kind; newsId: string } | null>(null);

  const cats = kind === "photo" ? PHOTO_CATEGORIES : VIDEO_CATEGORIES;
  const where = kind === "photo" ? "The Lens" : "The Reel";

  function resetForm() {
    setSel(null); setUrl(""); setThumbnail(""); setCaption(""); setDescription("");
    setLocation(""); setCategory(""); setCredit(""); setCreditUrl("");
    setMeta({ width: null, height: null, durationSeconds: null }); setPubErr("");
  }
  function switchKind(k: Kind) { if (k === kind) return; setKind(k); setResults([]); setSearchErr(""); resetForm(); setDone(null); }

  async function search() {
    const term = q.trim();
    if (term.length < 2) { setSearchErr("Enter a search term."); return; }
    setSearching(true); setSearchErr(""); setResults([]); setDone(null);
    try {
      const r = await api<{ items: Candidate[] }>("/api/ai/media/search", { method: "POST", body: JSON.stringify({ kind, q: term }) });
      setResults(r.items || []);
      if (!r.items?.length) setSearchErr("No results. Try different words, or add one by URL.");
    } catch (e: any) { setSearchErr(e.message || "Search failed."); }
    finally { setSearching(false); }
  }

  function choose(c: Candidate) {
    setSel(c); setManual(false); setPubErr(""); setDone(null);
    setUrl(c.url); setThumbnail(c.thumbnail);
    setCaption(c.title || ""); setCredit(c.creator || ""); setCreditUrl(c.creditUrl || "");
    setMeta({ width: c.width, height: c.height, durationSeconds: c.durationSeconds });
  }

  async function publish() {
    if (!url.trim()) { setPubErr(`Add ${kind === "photo" ? "an image" : "a video"} URL.`); return; }
    if (!credit.trim()) { setPubErr("Add a credit for the creator."); return; }
    setPublishing(true); setPubErr("");
    try {
      const r = await api<{ newsId: string }>("/api/ai/media/publish", {
        method: "POST",
        body: JSON.stringify({
          kind, url: url.trim(), thumbnail: thumbnail.trim(), caption: caption.trim(),
          description: description.trim(), location: location.trim(), category: category || undefined,
          credit: credit.trim(), creditUrl: creditUrl.trim(),
          width: meta.width, height: meta.height, durationSeconds: meta.durationSeconds,
        }),
      });
      setDone({ kind, newsId: r.newsId });
      setResults([]); setQ(""); resetForm();
    } catch (e: any) { setPubErr(e.message || "Publish failed."); }
    finally { setPublishing(false); }
  }

  const hasPick = !!url;

  return (
    <div className="card pad" style={{ marginBottom: 14 }}>
      <div className="mini" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>
        {kind === "photo" ? <ImageIcon size={14} /> : <Film size={14} />} LENS &amp; REEL — FIND MEDIA FOR THE NEWS APP
      </div>
      <div className="tiny muted" style={{ marginBottom: 10 }}>
        Find a license-clear {kind === "photo" ? "image for The Lens" : "video for The Reel"} (or paste a URL), then post it to the app. Every post carries the creator&rsquo;s credit and a link back to them.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <button className={"btn sm " + (kind === "photo" ? "primary" : "ghost")} onClick={() => switchKind("photo")}><ImageIcon size={14} /> The Lens</button>
        <button className={"btn sm " + (kind === "video" ? "primary" : "ghost")} onClick={() => switchKind("video")}><Film size={14} /> The Reel</button>
        <div style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={() => { setManual((m) => !m); setDone(null); if (!manual) resetForm(); }}>
          <Link2 size={13} /> {manual ? "Search instead" : "Add by URL"}
        </button>
      </div>

      {done && (
        <div className="card pad" style={{ marginBottom: 12, borderColor: "var(--gold)" }}>
          <div className="tiny" style={{ color: "#8fd6a8", display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={13} /> Posted to {done.kind === "photo" ? "The Lens" : "The Reel"}.
          </div>
          {done.kind === "video" && (
            <a className="btn ghost sm" style={{ marginTop: 8 }} href={`https://news.dot1.media/v/${encodeURIComponent(done.newsId)}`} target="_blank" rel="noreferrer">
              <ExternalLink size={12} /> View in the app
            </a>
          )}
        </div>
      )}

      {!manual && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 280px", minWidth: 0 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 10, opacity: 0.5 }} />
              <input className="in" placeholder={kind === "photo" ? "Search photos (e.g. Alaska fishing fleet)" : "Search video (e.g. mountain sunrise)"}
                value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !searching) search(); }}
                disabled={searching} style={{ paddingLeft: 30, width: "100%" }} />
            </div>
            <button className="btn primary" onClick={search} disabled={searching}>
              {searching ? <><RefreshCw size={15} className="spin" /> Searching…</> : <><Search size={15} /> Find</>}
            </button>
          </div>
          {searchErr && <div className="tiny" style={{ marginTop: 8, color: "#ffb4b4" }}>{searchErr}</div>}

          {results.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginTop: 12 }}>
              {results.map((c, i) => (
                <button key={c.url + i} onClick={() => choose(c)} className="card"
                  style={{ padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", border: sel?.url === c.url ? "2px solid var(--gold)" : undefined }}>
                  <div style={{ aspectRatio: "16/10", background: "#0002" }}>
                    {c.thumbnail ? <img src={c.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  </div>
                  <div style={{ padding: 8 }}>
                    <div className="tiny" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.creator}</div>
                    <div className="tiny muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.license || c.source}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {manual && (
        <div style={{ display: "grid", gap: 8 }}>
          <div><label className="f">{kind === "photo" ? "Image URL" : "Video URL (.mp4)"}</label>
            <input className="in" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
          {kind === "video" && <div><label className="f">Thumbnail URL</label>
            <input className="in" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://… (poster image)" /></div>}
        </div>
      )}

      {hasPick && (
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 14, display: "grid", gap: 10 }}>
          <div className="mini">POST TO {where.toUpperCase()}</div>
          {!manual && thumbnail && (
            <div style={{ width: 220, aspectRatio: "16/10", background: "#0002", borderRadius: 8, overflow: "hidden" }}>
              <img src={thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div><label className="f">{kind === "photo" ? "Caption" : "Title"}</label>
            <input className="in" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={kind === "photo" ? "What this photo shows" : "Video title"} /></div>
          <div><label className="f">Description</label>
            <textarea className="in" value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 52 }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="f">Category</label>
              <select className="in" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Choose…</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {kind === "photo" && <div><label className="f">Location</label>
              <input className="in" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where it was taken" /></div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="f">Credit ({kind === "photo" ? "photographer" : "videographer"})</label>
              <input className="in" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Creator name" /></div>
            <div><label className="f">Credit link</label>
              <input className="in" value={creditUrl} onChange={(e) => setCreditUrl(e.target.value)} placeholder="https://… (creator / source page)" /></div>
          </div>
          {pubErr && <div className="tiny" style={{ color: "#ffb4b4" }}>{pubErr}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn gold" onClick={publish} disabled={publishing}>
              {publishing ? <><RefreshCw size={15} className="spin" /> Posting…</> : <>Post to {where}</>}
            </button>
            <button className="btn ghost sm" onClick={resetForm} disabled={publishing}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
