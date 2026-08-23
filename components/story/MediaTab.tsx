"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import MediaUploader from "@/components/MediaUploader";
import MediaCard from "@/components/MediaCard";
import type { Capability } from "@/lib/permissions";

// Media attached to this story. Uploads here attach automatically (storyId passed to the uploader);
// detaching returns an asset to the general library without deleting it.
export default function MediaTab({ data, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const storyId = data.story.id;
  const [assets, setAssets] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const d = await api<{ assets: any[] }>(`/api/media?story=${storyId}`);
    setAssets(d.assets || []);
    setLoaded(true);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [storyId]);

  return (
    <div className="stack">
      {can("media.upload") && <MediaUploader storyId={storyId} onUploaded={() => load()} />}

      {!loaded ? (
        <span className="mono muted tiny">Loading…</span>
      ) : assets.length === 0 ? (
        <div className="card pad muted tiny">No media on this story yet. Upload photos or video above; they attach here automatically.</div>
      ) : (
        assets.map((a) => <MediaCard key={a.id} asset={a} reload={load} can={can} onDetach={load} />)
      )}
    </div>
  );
}
