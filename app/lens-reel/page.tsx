"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { Search, Trash2, ExternalLink, Image as ImageIcon, Film } from "lucide-react";

// Production tool: pull posts OUT of the news app's Lens (photos) and Reel (videos).
// Lists what is currently live and removes a selected item from the app. Reuses the
// published list + delete API, so a removal here is the same removal as elsewhere.
type Tab = "lens" | "reel";
const TYPE: Record<Tab, "photos" | "videos"> = { lens: "photos", reel: "videos" };
const KIND: Record<Tab, "photo" | "video"> = { lens: "photo", reel: "video" };

export default function LensReelPage() {
  const { can } = useMe();
  const [tab, setTab] = useState<Tab>("lens");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const canRemove = can("media.publish");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const d = await api<{ items: any[] }>(`/api/published?type=${TYPE[tab]}&q=${encodeURIComponent(q)}`);
      setItems(d.items || []);
    } catch (e: any) { setErr(e.message || "Could not load."); setItems([]); }
    finally { setLoading(false); }
  }, [tab, q]);

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  async function remove(id: string, label: string) {
    const where = tab === "lens" ? "The Lens" : "The Reel";
    if (!confirm(`Remove this from ${where} in the news app?\n\n"${label}"\n\nIt will no longer appear in the app. This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await api(`/api/published/${KIND[tab]}/${id}`, { method: "DELETE" });
      setItems((p) => p.filter((x) => x.id !== id));
    } catch (e: any) { alert(e.message || "Remove failed."); }
    finally { setBusyId(""); }
  }

  return (
    <Shell title="Lens & Reel" subtitle="Remove posts from the news app's Lens (photos) and Reel (videos).">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button className={"btn sm " + (tab === "lens" ? "primary" : "ghost")} onClick={() => { setTab("lens"); setItems([]); }}>
          <ImageIcon size={14} /> The Lens
        </button>
        <button className={"btn sm " + (tab === "reel" ? "primary" : "ghost")} onClick={() => { setTab("reel"); setItems([]); }}>
          <Film size={14} /> The Reel
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 9, opacity: 0.5 }} />
          <input className="in" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30, minWidth: 220 }} />
        </div>
      </div>

      {!canRemove && <div className="card pad tiny muted" style={{ marginBottom: 12 }}>You can view what is live here, but removing from the app needs the media-publish permission.</div>}
      {err && <div className="card pad" style={{ marginBottom: 12, color: "#ffb4b4" }}>{err}</div>}

      {loading ? <span className="mono muted tiny">Loading…</span> : items.length === 0 ? (
        <div className="card pad muted tiny">Nothing is live in {tab === "lens" ? "The Lens" : "The Reel"} right now.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14 }}>
          {items.map((m) => {
            const thumb = tab === "reel" ? m.thumbnail : m.image;
            const label = tab === "reel" ? (m.title || "Untitled") : (m.caption || "Untitled");
            const open = tab === "reel" ? (m.id ? `https://news.dot1.media/v/${encodeURIComponent(m.id)}` : "") : m.image;
            return (
              <div key={m.id} className="card" style={{ overflow: "hidden" }}>
                <div style={{ aspectRatio: "16/10", background: "#0002", overflow: "hidden" }}>
                  {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                </div>
                <div className="pad" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>{m.category || ""}{m.published_at ? " · " + new Date(m.published_at).toLocaleDateString() : ""}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {open && <a className="btn ghost sm" href={open} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Open</a>}
                    {canRemove && (
                      <button className="btn ghost sm" style={{ color: "#e88", marginLeft: "auto" }} disabled={busyId === m.id} onClick={() => remove(m.id, label)}>
                        <Trash2 size={12} /> {busyId === m.id ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
