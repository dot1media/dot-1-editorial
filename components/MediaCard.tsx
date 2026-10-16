"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { api } from "@/lib/client";
import { PHOTO_CATEGORIES, PHOTO_STYLES, VIDEO_CATEGORIES, VIDEO_STYLES } from "@/lib/newsroom";
import type { Capability } from "@/lib/permissions";
import { Trash2, Send, Check, ImageIcon } from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const editable = can("media.upload");
  const [thumb, setThumb] = useState<string>(asset.thumb_url && asset.thumb_url !== asset.blob_url ? asset.thumb_url : "");
  const [thumbBusy, setThumbBusy] = useState(false);
  const [thumbNote, setThumbNote] = useState("");
  const thumbInput = useRef<HTMLInputElement>(null);

  // Choose the still image that represents this video on the site, in the app, and in social previews.
  async function setThumbnail(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setErr("Thumbnail must be a JPEG, PNG, or WebP image."); return; }
    setThumbBusy(true); setErr(""); setThumbNote("");
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const b = await upload(`media/thumb/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, file, {
        access: "public", handleUploadUrl: "/api/media/blob", contentType: file.type,
      });
      await api(`/api/media/${asset.id}`, { method: "PATCH", body: JSON.stringify({ thumbUrl: b.url }) });
      setThumb(b.url);
      setThumbNote(published ? "Thumbnail saved. Press Re-publish to news to update the live site." : "Thumbnail saved.");
      reload();
    } catch (e: any) { setErr(e?.message || "Could not upload the thumbnail."); } finally { setThumbBusy(false); }
  }

  // Public, social-shareable page for a published video on the news site.
  const shareUrl = asset.news_id ? `https://news.dot1.media/v/${encodeURIComponent(asset.news_id)}` : "";
  async function copyShare() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

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
    const msg = published
      ? "Delete this media permanently? It is live, so it will also be removed from news.dot1.media and the app."
      : "Delete this media permanently?";
    if (!confirm(msg)) return;
    setErr("");
    try { await api(`/api/media/${asset.id}`, { method: "DELETE" }); reload(); }
    catch (e: any) { setErr(e?.message || "Could not delete."); }
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
            <video src={asset.blob_url} poster={thumb || undefined} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          )}
        </div>
        {!isImage && editable && (
          <div style={{ marginTop: 8 }}>
            <button className="btn ghost sm" onClick={() => thumbInput.current?.click()} disabled={thumbBusy} style={{ width: "100%" }}>
              <ImageIcon size={12} /> {thumbBusy ? "Uploading…" : thumb ? "Change thumbnail" : "Set thumbnail"}
            </button>
            <input ref={thumbInput} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setThumbnail(f); e.target.value = ""; }} />
            {!thumb && <div className="tiny muted" style={{ marginTop: 4 }}>No thumbnail yet. The site will show a frame from the video.</div>}
            {thumbNote && <div className="tiny" style={{ marginTop: 4, color: "#8fd6a8" }}>{thumbNote}</div>}
          </div>
        )}
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

        {!isImage && published && shareUrl && (
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 10 }}>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Share this video — plays on news.dot1.media and unfurls with a preview on social.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input className="in" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} style={{ flex: "1 1 240px", minWidth: 0, fontSize: 12.5 }} />
              <button className="btn ghost sm" onClick={copyShare}>{copied ? "Copied" : "Copy link"}</button>
              <a className="btn ghost sm" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(f.title || "")}`} target="_blank" rel="noreferrer">X</a>
              <a className="btn ghost sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">Facebook</a>
              <a className="btn ghost sm" href={shareUrl} target="_blank" rel="noreferrer">Open page</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
