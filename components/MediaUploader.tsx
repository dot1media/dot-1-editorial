"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { IMAGE_MIME, VIDEO_MIME } from "@/lib/newsroom";

// Streams a file straight to the upload endpoint as the raw body (matching the API). Reports
// progress via XHR so large videos show a real bar. Calls onUploaded with the new asset row.
export default function MediaUploader({ storyId, onUploaded }: { storyId?: string; onUploaded: (asset: any) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");

  const accept = [...IMAGE_MIME, ...VIDEO_MIME].join(",");

  function pick() { inputRef.current?.click(); }

  async function upload(file: File) {
    setErr("");
    if (![...IMAGE_MIME, ...VIDEO_MIME].includes(file.type)) {
      setErr("Unsupported type. Use JPEG, PNG, WebP, MP4, WebM, or MOV.");
      return;
    }
    setBusy(true); setPct(0);
    const qs = new URLSearchParams({ filename: file.name });
    if (storyId) qs.set("story", storyId);

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/media?${qs.toString()}`);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) onUploaded(data.asset);
          else setErr(data.error || "Upload failed.");
        } catch { setErr("Upload failed."); }
        resolve();
      };
      xhr.onerror = () => { setErr("Upload failed."); resolve(); };
      xhr.send(file);
    });
    setBusy(false); setPct(0);
  }

  return (
    <div>
      <div
        onClick={pick}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
        style={{
          border: `1.5px dashed ${drag ? "var(--gold)" : "var(--line)"}`,
          borderRadius: 10, padding: "26px 20px", textAlign: "center", cursor: "pointer",
          background: drag ? "rgba(200,162,74,.06)" : "transparent",
        }}
      >
        <Upload size={22} color="var(--gold)" style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{busy ? `Uploading… ${pct}%` : "Drop a file or click to upload"}</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>Images up to 25 MB, video up to 500 MB</div>
        {busy && (
          <div style={{ marginTop: 12, height: 5, background: "rgba(244,240,231,.1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--gold)", transition: "width .2s" }} />
          </div>
        )}
      </div>
      {err && <div className="tiny" style={{ color: "#ffb4b4", marginTop: 8 }}>{err}</div>}
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}
