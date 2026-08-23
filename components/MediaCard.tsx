"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { PHOTO_CATEGORIES, PHOTO_STYLES, VIDEO_CATEGORIES, VIDEO_STYLES } from "@/lib/newsroom";
import type { Capability } from "@/lib/permissions";
import { Trash2, Send, Check } from "lucide-react";

// A single media asset: preview, editable metadata, and publish. Used in the library and the
// story Media tab. Category/style options switch by kind to match the news vocabularies.
export default function MediaCard({ asset, reload, can, onDetach }: { asset: any; reload: () => void; can: (c: Capability) => boolean; onDetach?: () => void }) {
  const isImage = asset.kind === "image";
  const [f, setF] = useState({
    title: asset.title || "", caption: asset.caption || "", description: asset.description || "",
    credit: asset.credit || "", location: asset.location || "",
    category: asset.category || "", mediaStyle: asset.media_style || "",
  });
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(asset.status === "published");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const editable = can("media.upload");

  const cats = isImage ? PHOTO_CATEGORIES : VIDEO_CATEGORIES;
  const styles = isImage ? PHOTO_STYLES : VIDEO_STYLES;

  function set(k: string, v: string) { setF((p) => ({ ...p, [k]: v })); setSaved(false); }

  async function save() {
    setBusy(true); setErr("");
    try {
      await api(`/api/media/${asset.id}`, { method: "PATCH", body: JSON.stringify(f) });
      setSaved(true); reload();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true); setErr("");
    try {
      await save();
      await api(`/api/media/${asset.id}/publish`, { method: "POST" });
      setPublished(true); reload();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm("Delete this media permanently?")) return;
    await api(`/api/media/${asset.id}`, { method: "DELETE" });
    reload();
  }
  async function detach() {
    await api(`/api/media/${asset.id}`, { method: "PATCH", body: JSON.stringify({ storyId: null }) });
    reload(); onDetach?.();
  }

  const label: React.CSSProperties = {};

  return (
    <div className="card pad" style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
      <div>
        <div style={{ borderRadius: 8, overflow: "hidden", background: "#000", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isImage ? (
            <img src={asset.blob_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <video src={asset.blob_url} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span className="chip">{asset.kind}</span>
          {published ? <span className="chip ok">published</span> : <span className="chip dim">library</span>}
        </div>
      </div>

      <div className="stack" style={{ gap: 9 }}>
        {isImage ? (
          <div><label className="f">Caption</label><input className="in" value={f.caption} disabled={!editable} onChange={(e) => set("caption", e.target.value)} placeholder="What this photo shows" /></div>
        ) : (
          <div><label className="f">Title</label><input className="in" value={f.title} disabled={!editable} onChange={(e) => set("title", e.target.value)} /></div>
        )}
        <div><label className="f">Description</label><textarea className="in" value={f.description} disabled={!editable} onChange={(e) => set("description", e.target.value)} style={{ minHeight: 52 }} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label className="f">{isImage ? "Photographer" : "Producer"} credit</label><input className="in" value={f.credit} disabled={!editable} onChange={(e) => set("credit", e.target.value)} /></div>
          <div><label className="f">Location</label><input className="in" value={f.location} disabled={!editable} onChange={(e) => set("location", e.target.value)} /></div>
          <div>
            <label className="f">Category</label>
            <select className="in" value={f.category} disabled={!editable} onChange={(e) => set("category", e.target.value)}>
              <option value="">Choose…</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="f">Style</label>
            <select className="in" value={f.mediaStyle} disabled={!editable} onChange={(e) => set("mediaStyle", e.target.value)}>
              <option value="">Choose…</option>
              {styles.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {err && <div className="tiny" style={{ color: "#ffb4b4" }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {editable && <button className="btn ghost sm" onClick={save} disabled={busy}>Save</button>}
          {saved && <span className="tiny" style={{ color: "#8fd6a8" }}><Check size={12} /> Saved</span>}
          {can("media.publish") && <button className="btn gold sm" onClick={publish} disabled={busy}><Send size={13} /> {published ? "Re-publish to news" : "Publish to news"}</button>}
          {onDetach && <button className="btn ghost sm" onClick={detach}>Detach from story</button>}
          {editable && <button className="btn ghost sm" onClick={remove} style={{ marginLeft: "auto" }}><Trash2 size={13} /></button>}
        </div>
      </div>
    </div>
  );
}
