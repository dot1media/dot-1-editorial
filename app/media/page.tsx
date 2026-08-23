"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api, useMe, uploadFile, downscaleImage } from "@/lib/client";
import { Upload, Image as ImageIcon, Film, Trash2, Send, X } from "lucide-react";

const PHOTO_CATS = ["", "conflict", "humanitarian", "environment", "culture", "sports", "wildlife", "urban", "faith"];
const VIDEO_CATS = ["news-report", "documentary", "interview", "investigation", "testimony", "teaching", "short-film"];

export default function MediaPage() {
  const { can } = useMe();
  const [media, setMedia] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string>("");

  async function load() {
    const qs = filter ? `?kind=${filter}` : "";
    const d = await api<{ media: any[] }>(`/api/media${qs}`);
    setMedia(d.media || []);
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      setUploading(file.name);
      try {
        const toSend = isVideo ? file : await downscaleImage(file);
        const url = await uploadFile(toSend, isVideo ? "video" : "photo");
        await api("/api/media", {
          method: "POST",
          body: JSON.stringify({ kind: isVideo ? "video" : "photo", url, title: file.name.replace(/\.[^.]+$/, "") }),
        });
      } catch (e: any) {
        alert(e.message);
      }
    }
    setUploading("");
    if (fileRef.current) fileRef.current.value = "";
    load();
  }

  const canUpload = can("media.upload");

  return (
    <Shell
      title="Media Library"
      subtitle="Photos and videos. Upload here, publish to the news app and site."
      actions={canUpload ? (
        <>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => onFiles(e.target.files)} />
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={!!uploading}>
            <Upload size={15} /> {uploading ? "Uploading…" : "Upload media"}
          </button>
        </>
      ) : undefined}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={"btn sm " + (!filter ? "gold" : "ghost")} onClick={() => setFilter("")}>All</button>
        <button className={"btn sm " + (filter === "photo" ? "gold" : "ghost")} onClick={() => setFilter("photo")}>Photos</button>
        <button className={"btn sm " + (filter === "video" ? "gold" : "ghost")} onClick={() => setFilter("video")}>Videos</button>
      </div>

      {uploading && <div className="card pad tiny muted" style={{ marginBottom: 14 }}>Uploading {uploading}…</div>}

      {!loaded ? (
        <span className="mono muted tiny">Loading…</span>
      ) : media.length === 0 ? (
        <div className="card pad muted tiny">No media yet. {canUpload && "Upload photos or videos to begin."}</div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {media.map((m) => <MediaCard key={m.id} m={m} onEdit={() => setEditing(m)} />)}
        </div>
      )}

      {editing && <EditModal m={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} canPublish={can("media.publish")} />}
    </Shell>
  );
}

function MediaCard({ m, onEdit }: { m: any; onEdit: () => void }) {
  const published = m.status === "published";
  return (
    <div className="card" style={{ overflow: "hidden", cursor: "pointer" }} onClick={onEdit}>
      <div style={{ aspectRatio: "16/10", background: "#0f0c09", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {m.kind === "video" ? (
          m.thumbnail_url ? <img src={m.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Film size={30} color="var(--dim)" />
        ) : (
          <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <span className="chip" style={{ position: "absolute", top: 8, left: 8, background: "rgba(20,18,16,.8)" }}>
          {m.kind === "video" ? <Film size={11} /> : <ImageIcon size={11} />} {m.kind}
        </span>
        {published && <span className="chip ok" style={{ position: "absolute", top: 8, right: 8 }}>live</span>}
      </div>
      <div className="pad" style={{ padding: "12px 14px" }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.title || m.caption || "Untitled"}
        </div>
        <div className="tiny muted" style={{ marginTop: 3 }}>{m.location || m.category || "no metadata yet"}</div>
      </div>
    </div>
  );
}

function EditModal({ m, onClose, onSaved, canPublish }: { m: any; onClose: () => void; onSaved: () => void; canPublish: boolean }) {
  const isVideo = m.kind === "video";
  const [f, setF] = useState({
    title: m.title || "", caption: m.caption || "", description: m.description || "",
    location: m.location || "", credit: m.credit || "", category: m.category || (isVideo ? "news-report" : ""),
    duration: m.duration || "", thumbnailUrl: m.thumbnail_url || "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const thumbRef = useRef<HTMLInputElement>(null);

  function set(k: string, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function save() {
    setBusy(true); setMsg("");
    try {
      await api(`/api/media/${m.id}`, { method: "PATCH", body: JSON.stringify(f) });
      setMsg("Saved.");
      onSaved();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true); setMsg("");
    try {
      await api(`/api/media/${m.id}`, { method: "PATCH", body: JSON.stringify(f) });
      await api(`/api/media/${m.id}/publish`, { method: "POST" });
      setMsg("Published to news.");
      setTimeout(onSaved, 800);
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function uploadThumb(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const small = await downscaleImage(file, 1280);
      const url = await uploadFile(small, "thumbnail");
      set("thumbnailUrl", url);
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  const cats = isVideo ? VIDEO_CATS : PHOTO_CATS;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card wide" onClick={(e) => e.stopPropagation()}>
        <div className="pad">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>{isVideo ? "Video" : "Photo"} details</div>
            <button className="btn ghost sm" onClick={onClose}><X size={15} /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
            <div>
              <div style={{ borderRadius: 8, overflow: "hidden", background: "#0f0c09", aspectRatio: isVideo ? "16/9" : "1/1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isVideo ? (
                  <video src={m.url} controls poster={f.thumbnailUrl || undefined} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
                ) : (
                  <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              {isVideo && (
                <>
                  <input ref={thumbRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => uploadThumb(e.target.files?.[0])} />
                  <button className="btn ghost sm" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => thumbRef.current?.click()}>
                    {f.thumbnailUrl ? "Change thumbnail" : "Add thumbnail"}
                  </button>
                </>
              )}
              <a className="tiny muted" href={m.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8, wordBreak: "break-all" }}>Open original ↗</a>
            </div>

            <div className="stack">
              {isVideo ? (
                <>
                  <div><label className="f">Title</label><input className="in" value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
                  <div><label className="f">Description</label><textarea className="in" value={f.description} onChange={(e) => set("description", e.target.value)} style={{ minHeight: 70 }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label className="f">Category</label><select className="in" value={f.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="f">Duration</label><input className="in" value={f.duration} onChange={(e) => set("duration", e.target.value)} placeholder="12:34" /></div>
                  </div>
                </>
              ) : (
                <>
                  <div><label className="f">Caption</label><input className="in" value={f.caption} onChange={(e) => set("caption", e.target.value)} /></div>
                  <div><label className="f">Full description</label><textarea className="in" value={f.description} onChange={(e) => set("description", e.target.value)} style={{ minHeight: 60 }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label className="f">Location</label><input className="in" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Wasilla, AK" /></div>
                    <div><label className="f">Category</label><select className="in" value={f.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c || "(none)"}</option>)}</select></div>
                  </div>
                </>
              )}
              <div><label className="f">{isVideo ? "Producer / credit" : "Photographer / credit"}</label><input className="in" value={f.credit} onChange={(e) => set("credit", e.target.value)} placeholder="Name for the byline" /></div>

              {msg && <div className="tiny" style={{ color: msg.includes("ublish") || msg === "Saved." ? "#8fd6a8" : "#ffb4b4" }}>{msg}</div>}

              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span className="tiny muted">{m.status === "published" ? "Live on news. Re-publish to update." : "Draft. Not on news yet."}</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn ghost" onClick={save} disabled={busy}>Save</button>
                  {canPublish && <button className="btn gold" onClick={publish} disabled={busy}><Send size={14} /> {m.status === "published" ? "Re-publish" : "Publish to news"}</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
