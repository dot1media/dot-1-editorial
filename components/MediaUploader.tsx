"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { IMAGE_MIME, VIDEO_MIME, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/newsroom";

// Uploads the file straight from the browser to Vercel Blob (via a short-lived token from
// /api/media/blob), then registers the finished asset with POST /api/media. This bypasses the ~4.5 MB
// serverless request-body cap that made video uploads fail when the file was streamed through the API.
// Grab a still frame from a local video file (in the browser, before upload) to use as its
// thumbnail, and read its length. Returns nulls if the browser can't decode the format (some MOVs).
async function probeVideo(file: File): Promise<{ thumb: Blob | null; duration: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    let done = false;
    const finish = (thumb: Blob | null, duration: number | null) => {
      if (done) return; done = true;
      URL.revokeObjectURL(url); resolve({ thumb, duration });
    };
    const timer = setTimeout(() => finish(null, Number.isFinite(v.duration) ? Math.round(v.duration) : null), 12000);
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    v.onloadedmetadata = () => { v.currentTime = Math.min(3, (v.duration || 6) / 3); };
    v.onseeked = () => {
      try {
        const w = 1280, h = Math.round(w * (v.videoHeight || 720) / (v.videoWidth || 1280));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(v, 0, 0, w, h);
        c.toBlob((b) => { clearTimeout(timer); finish(b, Math.round(v.duration) || null); }, "image/jpeg", 0.86);
      } catch { clearTimeout(timer); finish(null, Math.round(v.duration) || null); }
    };
    v.onerror = () => { clearTimeout(timer); finish(null, null); };
  });
}

export default function MediaUploader({ storyId, onUploaded, only, label }: { storyId?: string; onUploaded: (asset: any) => void; only?: "image" | "video"; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Restrict the picker and validation to one media kind when `only` is set (so a Video section won't
  // take photos, and a Photojournalism section won't take video).
  const allowImage = only !== "video";
  const allowVideo = only !== "image";
  const accept = [...(allowImage ? IMAGE_MIME : []), ...(allowVideo ? VIDEO_MIME : [])].join(",");

  function pick() { inputRef.current?.click(); }

  async function doUpload(file: File) {
    setErr("");
    const isImage = IMAGE_MIME.includes(file.type);
    const isVideo = VIDEO_MIME.includes(file.type);
    if (!isImage && !isVideo) {
      setErr("Unsupported type. Use JPEG, PNG, WebP, MP4, WebM, or MOV.");
      return;
    }
    if (only === "video" && !isVideo) { setErr("This is the video section — choose an MP4, WebM, or MOV."); return; }
    if (only === "image" && !isImage) { setErr("This is the photo section — choose a JPEG, PNG, or WebP."); return; }
    const cap = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > cap) {
      setErr(`File is too large. Limit is ${Math.round(cap / 1024 / 1024)} MB for ${isImage ? "images" : "video"}.`);
      return;
    }

    setBusy(true);
    try {
      const kind = isImage ? "image" : "video";
      const ext = file.name.includes(".") ? file.name.split(".").pop() : isImage ? "jpg" : "mp4";
      const pathname = `media/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      // 1) Direct-to-Blob upload. multipart lets large videos upload in resumable chunks.
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/media/blob",
        contentType: file.type,
        multipart: file.size > 8 * 1024 * 1024,
      });

      // 1b) For video, upload a still frame as its thumbnail (best effort; skipped if it can't decode).
      let thumbUrl = "";
      let durationSeconds: number | null = null;
      if (isVideo) {
        try {
          const probe = await probeVideo(file);
          durationSeconds = probe.duration;
          if (probe.thumb) {
            const t = await upload(`media/thumb/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`, probe.thumb, {
              access: "public", handleUploadUrl: "/api/media/blob", contentType: "image/jpeg",
            });
            thumbUrl = t.url;
          }
        } catch { /* a missing thumbnail never blocks the upload */ }
      }

      // 2) Record the asset so it shows in the library and can be attached/published.
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blob.url, fileName: file.name, mime: file.type, size: file.size, story: storyId || null, thumbUrl, durationSeconds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || "Could not save the upload."); return; }
      onUploaded(data.asset);
    } catch (e: any) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        onClick={pick}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f && !busy) doUpload(f); }}
        style={{
          border: `1.5px dashed ${drag ? "var(--gold)" : "var(--line)"}`,
          borderRadius: 10, padding: "26px 20px", textAlign: "center", cursor: busy ? "default" : "pointer",
          background: drag ? "rgba(200,162,74,.06)" : "transparent",
        }}
      >
        <Upload size={22} color="var(--gold)" style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{busy ? "Uploading…" : (label || "Drop a file or click to upload")}</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          {busy
            ? "Large videos can take a few minutes — keep this tab open."
            : only === "video" ? "MP4 works best on the web (WebM and MOV also accepted), up to 2 GB. Sound is kept with the clip."
            : only === "image" ? "JPEG, PNG, or WebP — up to 25 MB."
            : "Images up to 25 MB, video up to 2 GB"}
        </div>
        {busy && (
          <div style={{ marginTop: 12, height: 5, background: "rgba(244,240,231,.1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", background: "var(--gold)", borderRadius: 3, animation: "mediaUploadSlide 1.1s ease-in-out infinite" }} />
          </div>
        )}
        <style>{`@keyframes mediaUploadSlide{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
      </div>
      {err && <div className="tiny" style={{ color: "#ffb4b4", marginTop: 8 }}>{err}</div>}
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ""; }} />
    </div>
  );
}
