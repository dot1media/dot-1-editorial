"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";
import { ReviewBadge, PriorityPill, ScoreProfile } from "@/components/ui";

export default function ReviewQueue() {
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await api<{ stories: any[] }>("/api/stories");
      const inReview = (d.stories || []).filter((s) => ["review", "verification", "ready"].includes(s.status) || ["verified", "editor_approved", "ready_to_publish"].includes(s.review_state));
      setStories(inReview);
      setLoaded(true);
    })();
  }, []);

  return (
    <Shell title="Review Queue" subtitle="Stories in verification, review, or ready to publish.">
      {!loaded ? <span className="mono muted tiny">Loading…</span> : stories.length === 0 ? (
        <div className="card pad muted tiny">Nothing awaiting review right now.</div>
      ) : (
        <div className="stack">
          {stories.map((s) => (
            <div key={s.id} className="card pad" style={{ cursor: "pointer" }} onClick={() => router.push(`/stories/${s.id}`)}>
              <div className="row-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.final_headline || s.working_headline}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <PriorityPill priority={s.priority} />
                    <ReviewBadge state={s.review_state} />
                    <span className="tiny muted">{s.category}</span>
                  </div>
                </div>
                <ScoreProfile scores={s.scores} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
