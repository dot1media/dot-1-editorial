"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";
import { STORY_LIFECYCLE } from "@/lib/newsroom";
import { ReviewBadge, PriorityPill } from "@/components/ui";

export default function Dashboard() {
  const [stories, setStories] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          api<{ stories: any[] }>("/api/stories"),
          api<{ tips: any[] }>("/api/tips?status=new").catch(() => ({ tips: [] })),
        ]);
        setStories(s.stories || []);
        setTips(t.tips || []);
      } catch {
        // viewer with no access or not configured yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const byStatus = (id: string) => stories.filter((s) => s.status === id).length;
  const active = stories.filter((s) => !["published", "archived"].includes(s.status));
  const readyish = stories.filter((s) => s.review_state === "ready_to_publish" || s.review_state === "editor_approved");
  const recent = stories.slice(0, 8);

  return (
    <Shell title="Newsroom" subtitle="One continuous workflow, from tip to publication.">
      {!loaded ? (
        <span className="mono muted tiny">Loading…</span>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
            <Stat label="Active stories" value={active.length} href="/stories" />
            <Stat label="New tips" value={tips.length} href="/tips" accent={tips.length > 0} />
            <Stat label="Awaiting publish" value={readyish.length} href="/review" />
            <Stat label="Published" value={byStatus("published")} href="/stories?status=published" />
          </div>

          <div className="card pad" style={{ marginBottom: 20 }}>
            <div className="mono tiny" style={{ letterSpacing: "0.2em", color: "var(--gold)", marginBottom: 14 }}>
              THE WORKFLOW
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {STORY_LIFECYCLE.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Link href={`/stories?status=${s.id}`} className="card" style={{ padding: "8px 12px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 78 }}>
                    <span className="disp" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{byStatus(s.id)}</span>
                    <span className="tiny muted" style={{ marginTop: 3, textAlign: "center" }}>{s.label}</span>
                  </Link>
                  {i < STORY_LIFECYCLE.length - 1 && <span style={{ color: "var(--crimson)" }}>›</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="pad" style={{ borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="mono tiny" style={{ letterSpacing: "0.2em", color: "var(--gold)" }}>RECENTLY UPDATED</span>
              <Link href="/stories" className="tiny muted">All stories ›</Link>
            </div>
            {recent.length === 0 ? (
              <div className="pad muted tiny">No stories yet. Create one from the Stories tab, or promote a tip.</div>
            ) : (
              <table className="grid-t">
                <thead>
                  <tr><th>Headline</th><th>Status</th><th>Priority</th><th>Review</th></tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => (window.location.href = `/stories/${s.id}`)}>
                      <td style={{ fontWeight: 600 }}>{s.final_headline || s.working_headline}</td>
                      <td><span className="chip">{STORY_LIFECYCLE.find((x) => x.id === s.status)?.label || s.status}</span></td>
                      <td><PriorityPill priority={s.priority} /></td>
                      <td><ReviewBadge state={s.review_state} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

function Stat({ label, value, href, accent }: { label: string; value: number; href: string; accent?: boolean }) {
  return (
    <Link href={href} className="card pad" style={{ display: "block" }}>
      <div className="disp" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: accent ? "var(--gold)" : "var(--bone)" }}>{value}</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>{label}</div>
    </Link>
  );
}
