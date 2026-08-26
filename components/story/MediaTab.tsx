"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import MediaUploader from "@/components/MediaUploader";
import MediaCard from "@/components/MediaCard";
import type { Capability } from "@/lib/permissions";

// Media attached to this story. Uploads attach automatically (storyId passed to the uploader).
// Real news clips are usually embedded by URL with attribution rather than re-uploaded; that is
// what "Link a clip" does. Detaching returns an asset to the general library without deleting it.
export default function MediaTab({ data, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const storyId = data.story.id;
  const [assets, setAssets] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [linkOpen, setLinkOpen] = useState(false);
  const [vurl, setVurl] = useState("");
  const [vcredit, setVcredit] = useState("");
  const [vtitle, setVtitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const d = await api<{ assets: any[] }>(`/api/media?story=${storyId}`);
    setAssets(d.assets || []);
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [storyId]);

  async function linkClip() {
    const u = vurl.trim();
    if (!/^https?:\/\//i.test(u)) { setErr("Enter a valid https URL."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: u, credit: vcredit.trim(), title: vtitle.trim(), kind: "video", story: storyId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Could not attach the clip."); setSaving(false); return; }
      setVurl(""); setVcredit(""); setVtitle(""); setLinkOpen(false);
      await load();
    } catch {
      setErr("Could not attach the clip.");
    }
    setSaving(false);
  }

  return (
    <div className="stack">
      {can("media.upload") && <MediaUploader storyId={storyId} onUploaded={() => load()} />}

      {can("media.upload") && (
        <div className="card pad">
          <div className="row-between" style={{ marginBottom: linkOpen ? 14 : 0 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>Link a clip by URL</div>
              <div className="muted tiny" style={{ marginTop: 2 }}>Embed an official, attributed news video instead of re-uploading footage.</div>
            </div>
            <button className="btn sm ghost" onClick={() => { setLinkOpen((v) => !v); setErr(""); }}>{linkOpen ? "Cancel" : "Add clip"}</button>
          </div>
          {linkOpen && (
            <div className="stack" style={{ gap: 10 }}>
              <div>
                <label className="f">Video URL</label>
                <input className="in" placeholder="https://www.youtube.com/watch?v=..." value={vurl} onChange={(e) => setVurl(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="f">Label (optional)</label>
                  <input className="in" placeholder="What the clip shows" value={vtitle} onChange={(e) => setVtitle(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="f">Credit / source</label>
                  <input className="in" placeholder="e.g. Reuters, AP, official channel" value={vcredit} onChange={(e) => setVcredit(e.target.value)} />
                </div>
              </div>
              {err && <div className="tiny" style={{ color: "var(--bad)" }}>{err}</div>}
              <div>
                <button className="btn primary sm" onClick={linkClip} disabled={saving}>{saving ? "Attaching…" : "Attach clip"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!loaded ? (
        <span className="mono muted tiny">Loading…</span>
      ) : assets.length === 0 ? (
        <div className="card pad muted tiny">No media on this story yet. Upload photos or video, or link a clip by URL, and it attaches here.</div>
      ) : (
        assets.map((a) => <MediaCard key={a.id} asset={a} reload={load} can={can} onDetach={load} />)
      )}
    </div>
  );
}
