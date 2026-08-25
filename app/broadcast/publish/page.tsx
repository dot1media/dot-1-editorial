"use client";

import { useState, useRef } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { CATEGORIES } from "@/lib/newsroom";
import * as tus from "tus-js-client";
import { UploadCloud, CheckCircle2, Film } from "lucide-react";

type Stage = "form" | "uploading" | "publishing" | "done" | "error";

export default function PublishEpisodePage() {
  const { can } = useMe();
  const mayPublish = can("media.publish") || can("broadcast.golive");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [producer, setProducer] = useState("Dot 1 News");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const uploadRef = useRef<tus.Upload | null>(null);

  const ready = !!file && title.trim().length > 1 && mayPublish;

  async function start(publish: boolean) {
    if (!file) return;
    setErr(""); setStage("uploading"); setPct(0);
    try {
      // 1) one-time resumable upload URL from Cloudflare (via our server)
      const { uid, uploadURL } = await api<{ uid: string; uploadURL: string }>("/api/episodes/upload-url", {
        method: "POST", body: JSON.stringify({ name: file.name, size: file.size }),
      });
      // 2) upload the file straight to Cloudflare, resumable, with progress
      await new Promise<void>((resolve, reject) => {
        const up = new tus.Upload(file, {
          uploadUrl: uploadURL,
          chunkSize: 50 * 1024 * 1024, // 50 MB chunks (Cloudflare requires a set chunk size)
          metadata: { name: file.name, filetype: file.type },
          onError: (e) => reject(e),
          onProgress: (sent, total) => setPct(Math.round((sent / total) * 100)),
          onSuccess: () => resolve(),
        });
        uploadRef.current = up;
        up.start();
      });
      // 3) publish (write the episode into the news library)
      setStage("publishing");
      await api("/api/episodes", { method: "POST", body: JSON.stringify({ uid, title, description, category, producer, publish }) });
      setStage("done");
    } catch (e: any) {
      setErr(e?.message || "Upload failed. You can retry."); setStage("error");
    }
  }

  if (stage === "done") {
    return (
      <Shell title="Publish Episode">
        <div className="card pad" style={{ textAlign: "center", padding: 40 }}>
          <CheckCircle2 size={40} color="#5bbf9a" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 18, fontWeight: 700 }}>Episode uploaded</div>
          <div className="tiny muted" style={{ marginTop: 8, maxWidth: 420, margin: "8px auto 0", lineHeight: 1.6 }}>
            Cloudflare is encoding it now (a few minutes). It appears in the app and site once ready, and you can manage it anytime under Published → Videos.
          </div>
          <button className="btn primary sm" style={{ marginTop: 18 }} onClick={() => { setFile(null); setTitle(""); setDescription(""); setPct(0); setStage("form"); }}>Upload another</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Publish Episode" subtitle="Upload a finished cut (your DaVinci export) to the app and site.">
      {!mayPublish && <div className="card pad muted tiny" style={{ marginBottom: 16 }}>Publishing episodes needs media permissions.</div>}

      <div className="card pad stack" style={{ maxWidth: 640, display: "grid", gap: 14 }}>
        <div><label className="f">Title</label>
          <input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Evening Report — March 14" disabled={stage !== "form"} />
        </div>
        <div><label className="f">Description</label>
          <textarea className="in" value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 90 }} disabled={stage !== "form"} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><label className="f">Category</label>
            <select className="in" value={category} onChange={(e) => setCategory(e.target.value)} disabled={stage !== "form"}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}><label className="f">Host / producer</label>
            <input className="in" value={producer} onChange={(e) => setProducer(e.target.value)} disabled={stage !== "form"} />
          </div>
        </div>

        <div>
          <label className="f">Video file (from DaVinci)</label>
          <label className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, cursor: stage === "form" ? "pointer" : "default", border: "1px dashed var(--rule,#3a352d)" }}>
            <Film size={20} style={{ opacity: 0.6 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{file ? file.name : "Choose a video file…"}</div>
              {file && <div className="tiny muted">{(file.size / 1024 / 1024).toFixed(0)} MB</div>}
            </div>
            <input type="file" accept="video/*" style={{ display: "none" }} disabled={stage !== "form"}
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        {stage === "uploading" && (
          <div>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Uploading to Cloudflare… {pct}%</div>
            <div style={{ height: 8, background: "#0003", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--gold,#c8a24a)", transition: "width .2s" }} />
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>Keep this tab open until it reaches 100%.</div>
          </div>
        )}
        {stage === "publishing" && <div className="tiny muted">Finishing up…</div>}
        {err && <div className="tiny" style={{ color: "#ffb4b4" }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {stage === "form" || stage === "error" ? (
            <>
              <button className="btn ghost" disabled={!ready} onClick={() => start(false)}>Upload as draft</button>
              <button className="btn primary" disabled={!ready} onClick={() => start(true)}><UploadCloud size={15} /> Upload &amp; publish</button>
            </>
          ) : (
            <button className="btn ghost" disabled>Working…</button>
          )}
        </div>
      </div>
    </Shell>
  );
}
