"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import MediaUploader from "@/components/MediaUploader";
import MediaCard from "@/components/MediaCard";

export default function MediaLibraryPage() {
  const { can } = useMe();
  const [assets, setAssets] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const qs = filter === "all" ? "" : `?kind=${filter}`;
    const d = await api<{ assets: any[] }>(`/api/media${qs}`);
    setAssets(d.assets || []);
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  return (
    <Shell title="Media" subtitle="Images and video for the newsroom. Upload, describe, publish.">
      {can("media.upload") && (
        <div style={{ marginBottom: 18 }}>
          <MediaUploader onUploaded={() => load()} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "image", "video"] as const).map((k) => (
          <button key={k} className={"btn sm " + (filter === k ? "gold" : "ghost")} onClick={() => setFilter(k)}>
            {k === "all" ? "All" : k === "image" ? "Images" : "Video"}
          </button>
        ))}
      </div>

      {!loaded ? (
        <span className="mono muted tiny">Loading…</span>
      ) : assets.length === 0 ? (
        <div className="card pad muted tiny">No media yet. Upload something to begin.</div>
      ) : (
        <div className="stack">
          {assets.map((a) => <MediaCard key={a.id} asset={a} reload={load} can={can} />)}
        </div>
      )}
    </Shell>
  );
}
