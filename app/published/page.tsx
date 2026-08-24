"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { CATEGORIES } from "@/lib/newsroom";
import { Search, Pencil, Trash2, ExternalLink, X } from "lucide-react";

type Tab = "articles" | "photos" | "videos";

export default function PublishedPage() {
  const { can } = useMe();
  const [tab, setTab] = useState<Tab>("articles");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const d = await api<{ items: any[] }>(`/api/published?type=${tab}&q=${encodeURIComponent(q)}`);
      setItems(d.items || []);
    } catch (e: any) { setErr(e.message || "Could not load."); setItems([]); }
    finally { setLoading(false); }
  }, [tab, q]);

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  async function del(kind: string, id: string, label: string) {
    if (!confirm(`Delete this ${kind} from the live site?\n\n"${label}"\n\nThis cannot be undone.`)) return;
    try { await api(`/api/published/${kind}/${id}`, { method: "DELETE" }); setItems((p) => p.filter((x) => x.id !== id)); }
    catch (e: any) { alert(e.message || "Delete failed."); }
  }

  const canEdit = can("story.edit");
  const canDelArticle = can("story.delete");
  const canDelMedia = can("media.publish");

  return (
    <Shell title="Published" subtitle="Everything live on the news site. Edit or remove past articles, photos, and videos.">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {(["articles", "photos", "videos"] as Tab[]).map((t) => (
          <button key={t} className={"btn sm " + (tab === t ? "primary" : "ghost")} onClick={() => { setTab(t); setItems([]); }}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 9, opacity: 0.5 }} />
          <input className="in" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30, minWidth: 220 }} />
        </div>
      </div>

      {err && <div className="card pad" style={{ marginBottom: 12, color: "#ffb4b4" }}>{err}</div>}
      {loading ? <span className="mono muted tiny">Loading…</span> : items.length === 0 ? (
        <div className="card pad muted tiny">Nothing here yet.</div>
      ) : tab === "articles" ? (
        <div className="card">
          <table className="grid-t">
            <thead><tr><th>Headline</th><th>Category</th><th>Score</th><th>Published</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.title}</td>
                  <td className="tiny muted">{a.category}</td>
                  <td className="mono tiny">{a.total ?? "—"}</td>
                  <td className="tiny muted">{a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {canEdit && <button className="btn ghost sm" onClick={() => setEditing(a)}><Pencil size={13} /> Edit</button>}
                    {canDelArticle && <button className="btn ghost sm" style={{ color: "#e88" }} onClick={() => del("article", a.id, a.title)}><Trash2 size={13} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
          {items.map((m) => (
            <div key={m.id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ aspectRatio: "16/10", background: "#0002", overflow: "hidden" }}>
                <img src={tab === "videos" ? m.thumbnail : m.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div className="pad" style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{tab === "videos" ? m.title : (m.caption || "Untitled")}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{m.category || ""}{m.published_at ? " · " + new Date(m.published_at).toLocaleDateString() : ""}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <a className="btn ghost sm" href={tab === "videos" ? m.video_url : m.image} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Open</a>
                  {canDelMedia && <button className="btn ghost sm" style={{ color: "#e88" }} onClick={() => del(tab === "videos" ? "video" : "photo", m.id, tab === "videos" ? m.title : (m.caption || "media"))}><Trash2 size={12} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <EditModal article={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Shell>
  );
}

function EditModal({ article, onClose, onSaved }: { article: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ article: any }>(`/api/published/article/${article.id}`).then((d) => setF(d.article)).catch((e) => setErr(e.message));
  }, [article.id]);

  async function save() {
    setSaving(true); setErr("");
    try {
      await api(`/api/published/article/${article.id}`, { method: "PATCH", body: JSON.stringify({
        title: f.title, summary: f.summary, content: f.content, category: f.category, image: f.image, author: f.author,
      }) });
      onSaved();
    } catch (e: any) { setErr(e.message || "Save failed."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "flex-start", overflow: "auto", padding: "6vh 16px" }} onClick={onClose}>
      <div className="card pad" style={{ maxWidth: 640, width: "100%", background: "var(--panel, #1a1714)" }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="mini">EDIT PUBLISHED ARTICLE</div>
          <button className="btn ghost sm" onClick={onClose}><X size={15} /></button>
        </div>
        {!f ? <span className="mono muted tiny">Loading…</span> : (
          <div className="stack" style={{ display: "grid", gap: 10 }}>
            <div><label className="f">Headline</label><input className="in" value={f.title || ""} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><label className="f">Summary</label><textarea className="in" value={f.summary || ""} onChange={(e) => setF({ ...f, summary: e.target.value })} style={{ minHeight: 60 }} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label className="f">Category</label>
                <select className="in" value={f.category || ""} onChange={(e) => setF({ ...f, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}><label className="f">Byline</label><input className="in" value={f.author || ""} onChange={(e) => setF({ ...f, author: e.target.value })} /></div>
            </div>
            <div><label className="f">Hero image URL</label><input className="in" value={f.image || ""} onChange={(e) => setF({ ...f, image: e.target.value })} /></div>
            <div><label className="f">Body</label><textarea className="in" value={f.content || ""} onChange={(e) => setF({ ...f, content: e.target.value })} style={{ minHeight: 220, fontFamily: "inherit" }} /></div>
            {err && <div className="tiny" style={{ color: "#ffb4b4" }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes (goes live)"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
