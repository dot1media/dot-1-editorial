"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { STORY_LIFECYCLE, STORY_FLAGS } from "@/lib/newsroom";
import { ScoreProfile } from "@/components/ui";
import type { Capability } from "@/lib/permissions";
import { Send, Upload } from "lucide-react";

const ASSIGN_ROLES = [
  { key: "reporter", label: "Reporter", col: "reporter_email" },
  { key: "editor", label: "Editor", col: "editor_email" },
  { key: "producer", label: "Producer", col: "producer_email" },
  { key: "photographer", label: "Photographer", col: "photographer_email" },
  { key: "anchor", label: "Anchor", col: "anchor_email" },
  { key: "director", label: "Director", col: "director_email" },
];

export default function RightRail({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const s = data.story;
  const router = useRouter();
  const [pubOpen, setPubOpen] = useState(false);

  async function setStatus(status: string) {
    await api(`/api/stories/${s.id}/status`, { method: "POST", body: JSON.stringify({ status }) });
    reload();
  }
  async function toggleFlag(flag: string) {
    const flags = Array.isArray(s.flags) ? [...s.flags] : [];
    const i = flags.indexOf(flag);
    if (i >= 0) flags.splice(i, 1); else flags.push(flag);
    await api(`/api/stories/${s.id}/status`, { method: "POST", body: JSON.stringify({ flags }) });
    reload();
  }
  async function assign(key: string, value: string) {
    await api(`/api/stories/${s.id}/assign`, { method: "POST", body: JSON.stringify({ [key]: value }) });
    reload();
  }

  const isPublished = s.status === "published";
  const ready = s.review_state === "ready_to_publish";

  return (
    <div className="stack" style={{ position: "sticky", top: 90 }}>
      {can("publish.toNews") && (
        <div className="card pad">
          <div className="mini" style={{ marginBottom: 10 }}>PUBLISH</div>
          {isPublished ? (
            <>
              <div className="tiny" style={{ color: "#8fd6a8", marginBottom: 10 }}>Live on news.dot1.media</div>
              <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setPubOpen(true)}>
                <Upload size={14} /> Re-sync to news
              </button>
            </>
          ) : (
            <>
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>
                {ready ? "This story is Ready to Publish." : "Not yet Ready to Publish. Publishing will require an override with a reason."}
              </div>
              <button className={"btn " + (ready ? "gold" : "primary")} style={{ width: "100%", justifyContent: "center" }} onClick={() => setPubOpen(true)}>
                <Send size={14} /> Publish to news
              </button>
            </>
          )}
        </div>
      )}

      <div className="card pad">
        <div className="mini" style={{ marginBottom: 10 }}>STATUS</div>
        {can("story.changeStatus") ? (
          <select className="in" value={s.status} onChange={(e) => setStatus(e.target.value)} disabled={isPublished}>
            {STORY_LIFECYCLE.filter((x) => x.id !== "published").map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            {isPublished && <option value="published">Published / Broadcast</option>}
          </select>
        ) : (
          <div className="tiny">{STORY_LIFECYCLE.find((x) => x.id === s.status)?.label}</div>
        )}

        {can("story.changeStatus") && (
          <div style={{ marginTop: 12 }}>
            <div className="mini" style={{ marginBottom: 8 }}>FLAGS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STORY_FLAGS.map((f) => {
                const on = Array.isArray(s.flags) && s.flags.includes(f.id);
                return <button key={f.id} className={"btn sm " + (on ? "primary" : "ghost")} onClick={() => toggleFlag(f.id)}>{f.label}</button>;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card pad">
        <div className="mini" style={{ marginBottom: 10 }}>D1-4LS PROFILE</div>
        <ScoreProfile scores={s.scores} />
      </div>

      <div className="card pad">
        <div className="mini" style={{ marginBottom: 10 }}>ASSIGNMENTS</div>
        <div className="stack" style={{ gap: 9 }}>
          {ASSIGN_ROLES.map((r) => (
            <div key={r.key}>
              <label className="f" style={{ marginBottom: 3 }}>{r.label}</label>
              {can("story.assign") ? (
                <input className="in" style={{ padding: "7px 10px", fontSize: 12.5 }} defaultValue={s[r.col] || ""} placeholder="email@dot1.media"
                  onBlur={(e) => e.target.value !== (s[r.col] || "") && assign(r.key, e.target.value)} />
              ) : (
                <div className="tiny muted">{s[r.col] || "unassigned"}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {pubOpen && <PublishModal story={s} ready={ready} canOverride={can("publish.override")} onClose={() => setPubOpen(false)} onDone={() => { setPubOpen(false); reload(); }} />}
    </div>
  );
}

function PublishModal({ story, ready, canOverride, onClose, onDone }: { story: any; ready: boolean; canOverride: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<string>("");

  async function publish() {
    setBusy(true); setErr("");
    try {
      const r = await api<{ newsStoryId: string; overridden: boolean }>(`/api/stories/${story.id}/publish`, {
        method: "POST", body: JSON.stringify({ overrideReason: reason }),
      });
      setResult(r.overridden ? "Published with override." : "Published.");
      setTimeout(onDone, 900);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="pad">
          <div className="disp" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Publish to news.dot1.media</div>
          <div className="tiny muted" style={{ marginBottom: 16, lineHeight: 1.5 }}>
            This writes the story into the news database. Readers see it in the app and on the site.
          </div>

          {!ready && (
            <div className="card pad" style={{ background: "rgba(184,22,22,.1)", borderColor: "var(--crimson)", marginBottom: 14 }}>
              <div className="tiny" style={{ color: "#ffb4b4", lineHeight: 1.5 }}>
                This story has not completed editorial review.
                {canOverride ? " As an authorized editor you may override, but you must give a reason, which is recorded in the audit log." : " You do not have override permission; an editor must publish it."}
              </div>
            </div>
          )}

          {!ready && canOverride && (
            <div style={{ marginBottom: 14 }}>
              <label className="f">Override reason (required)</label>
              <textarea className="in" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: 60 }} placeholder="Why is this publishing before review is complete?" />
            </div>
          )}

          {err && <div className="tiny" style={{ color: "#ffb4b4", marginBottom: 12 }}>{err}</div>}
          {result && <div className="tiny" style={{ color: "#8fd6a8", marginBottom: 12 }}>{result}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn gold" onClick={publish} disabled={busy || (!ready && canOverride && !reason.trim()) || (!ready && !canOverride)}>
              {busy ? "Publishing…" : ready ? "Publish" : "Publish with override"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
