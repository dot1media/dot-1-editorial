"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { STORY_LIFECYCLE, STORY_FLAGS, REVIEW_ITEMS, reviewProgress } from "@/lib/newsroom";
import { ReviewBadge, PriorityPill } from "@/components/ui";
import StoryTab from "@/components/story/StoryTab";
import SourcesTab from "@/components/story/SourcesTab";
import EvidenceTab from "@/components/story/EvidenceTab";
import LogTab from "@/components/story/LogTab";
import VerificationTab from "@/components/story/VerificationTab";
import ScoreTab from "@/components/story/ScoreTab";
import ReviewTab from "@/components/story/ReviewTab";
import CorrectionsTab from "@/components/story/CorrectionsTab";
import MediaTab from "@/components/story/MediaTab";
import RightRail from "@/components/story/RightRail";

export default function StoryWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useMe();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("story");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/stories/${id}`);
      setData(d);
    } catch (e: any) {
      setErr(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (err) return <Shell title="Story"><div className="card pad" style={{ color: "#ffb4b4" }}>{err}</div></Shell>;
  if (!data) return <Shell title="Story"><span className="mono muted tiny">Loading…</span></Shell>;

  const s = data.story;
  const prog = reviewProgress(data.checklist?.items);

  const TABS = [
    { id: "story", label: "Story" },
    { id: "sources", label: "Sources", n: data.sources.length },
    { id: "evidence", label: "Evidence", n: data.evidence.length },
    { id: "log", label: "Reporting Log", n: data.log.length },
    { id: "verification", label: "Verification", n: data.claims.length },
    { id: "score", label: "D1-4LS Score" },
    { id: "media", label: "Media" },
    { id: "review", label: "Review", n: `${prog.done}/${prog.total}` },
    { id: "corrections", label: "Corrections", n: data.corrections.length },
  ];

  return (
    <Shell
      title={s.final_headline || s.working_headline}
      subtitle={`${s.classification.toUpperCase()} · ${s.category} · ${s.location || "no location set"}`}
    >
      <div className="row-between" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <PriorityPill priority={s.priority} />
          <ReviewBadge state={s.review_state} />
          {Array.isArray(s.flags) && s.flags.map((f: string) => (
            <span key={f} className="chip crimson">{STORY_FLAGS.find((x) => x.id === f)?.label || f}</span>
          ))}
        </div>
        <button className="btn ghost sm" onClick={() => router.push("/stories")}>← All stories</button>
      </div>

      <div className="work">
        <div>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={"tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
                {t.label}{t.n !== undefined && <span className="n">{t.n}</span>}
              </button>
            ))}
          </div>

          {tab === "story" && <StoryTab data={data} reload={load} can={can} />}
          {tab === "sources" && <SourcesTab data={data} reload={load} can={can} />}
          {tab === "evidence" && <EvidenceTab data={data} reload={load} can={can} />}
          {tab === "log" && <LogTab data={data} reload={load} can={can} />}
          {tab === "verification" && <VerificationTab data={data} reload={load} can={can} />}
          {tab === "score" && <ScoreTab data={data} reload={load} can={can} />}
          {tab === "media" && <MediaTab data={data} reload={load} can={can} />}
          {tab === "review" && <ReviewTab data={data} reload={load} can={can} />}
          {tab === "corrections" && <CorrectionsTab data={data} reload={load} can={can} />}
        </div>

        <RightRail data={data} reload={load} can={can} />
      </div>
    </Shell>
  );
}
