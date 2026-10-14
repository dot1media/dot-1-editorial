"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import MediaUploader from "@/components/MediaUploader";
import MediaCard from "@/components/MediaCard";

export default function MediaLibraryPage() {
  const { can } = useMe();
  const [videos, setVideos] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const [v, p] = await Promise.all([
      api<{ assets: any[] }>(`/api/media?kind=video`),
      api<{ assets: any[] }>(`/api/media?kind=image`),
    ]);
    setVideos(v.assets || []);
    setPhotos(p.assets || []);
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const mayUpload = can("media.upload");

  return (
    <Shell title="Media" subtitle="Video and photojournalism for the newsroom. Upload, describe, publish.">
      {/* ---------- Video ---------- */}
      <section style={{ marginBottom: 34 }}>
        <h2 className="mono" style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>Video uploads</h2>
        {mayUpload && (
          <div style={{ marginBottom: 16 }}>
            <MediaUploader only="video" label="Drop a video or click to upload" onUploaded={() => load()} />
          </div>
        )}
        {!loaded ? (
          <span className="mono muted tiny">Loading…</span>
        ) : videos.length === 0 ? (
          <div className="card pad muted tiny">No video yet. Upload a clip to begin — its audio is kept with the file.</div>
        ) : (
          <div className="stack">
            {videos.map((a) => <MediaCard key={a.id} asset={a} reload={load} can={can} />)}
          </div>
        )}
      </section>

      {/* ---------- Photojournalism ---------- */}
      <section>
        <h2 className="mono" style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>Photojournalism uploads</h2>
        {mayUpload && (
          <div style={{ marginBottom: 16 }}>
            <MediaUploader only="image" label="Drop a photo or click to upload" onUploaded={() => load()} />
          </div>
        )}
        {!loaded ? (
          <span className="mono muted tiny">Loading…</span>
        ) : photos.length === 0 ? (
          <div className="card pad muted tiny">No photos yet. Upload an image to begin.</div>
        ) : (
          <div className="stack">
            {photos.map((a) => <MediaCard key={a.id} asset={a} reload={load} can={can} />)}
          </div>
        )}
      </section>
    </Shell>
  );
}
