"use client";

import { useState, useEffect } from "react";
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
  const [related, setRelated] = useState<any[]>([]);
  useEffect(() => { api<{ related: any[] }>(`/api/stories/${s.id}/related`).then((d) => setRelated(d.related || [])).catch(() => {}); }, [s.id, s.working_headline, s.final_headline]);

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
  async function setVerification(status: string, override: boolean) {
    await api(`/api/stories/${s.id}/verification`, { method: "POST", body: JSON.stringify({ status, override }) });
    reload();
  }

  const isPublished = s.status === "published";
  const ready = s.review_state === "ready_to_publish";

  return (
    <div className="stack" style={{ position: "sticky", top: 90 }}>
      {related.length > 0 && (
        <div className="card pad">
          <div className="f" style={{ marginBottom: 6 }}>Related {related.some((r) => r.duplicate) && <span className="pill" style={{ background: "var(--crimson, #b81616)", color: "var(--bone, #f4f0e7)", marginLeft: 6 }}>possible duplicate</span>}</div>
          {related.map((r) => (
            <a key={r.id} href={`/stories/${r.id}`} style={{ display: "block", padding: "6px 0", borderTop: "1px solid var(--line)", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 13, fontWeight: r.duplicate ? 700 : 500 }}>{r.headline}</div>
              <div className="muted" style={{ fontSize: 11 }}>{r.status}{r.shared && r.shared.length ? " · " + r.shared.slice(0, 4).join(", ") : ""}{r.duplicate ? " · check before publishing" : ""}</div>
            </a>
          ))}
        </div>
      )}
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
        <div className="mini" style={{ marginBottom: 10 }}>VERIFICATION</div>
        <VerificationControl story={s} canEdit={can("story.changeStatus")} isPublished={isPublished} onChange={setVerification} />
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

const V_OPTIONS = [
  { id: "verified", label: "Verified", color: "#D4AF37", help: "Gold. Checked against its sources; a published story is verified by default." },
  { id: "pending", label: "Pending", color: "#E08A2B", help: "Orange. A second independent check is still in progress." },
  { id: "unverified", label: "Unverified", color: "#C8372A", help: "Red. Written from the brief, not yet checked." },
];

function VerificationControl({ story, canEdit, isPublished, onChange }: { story: any; canEdit: boolean; isPublished: boolean; onChange: (status: string, override: boolean) => Promise<void>; }) {
  const current = (story.verification_status as string) || "verified";
  const [status, setStatus] = useState(current);
  const [override, setOverride] = useState(!!story.verification_override);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setStatus((story.verification_status as string) || "verified");
    setOverride(!!story.verification_override);
  }, [story.verification_status, story.verification_override]);

  const active = V_OPTIONS.find((o) => o.id === status) || V_OPTIONS[0];

  async function commit(nextStatus: string, nextOverride: boolean) {
    setStatus(nextStatus); setOverride(nextOverride);
    if (!canEdit) return;
    setBusy(true); setNote("");
    try {
      await onChange(nextStatus, nextOverride);
      setNote(isPublished ? "Updated. Live on news and app." : "Saved. Applies when published.");
    } catch (e: any) {
      setNote(e.message || "Could not save.");
    } finally {
      setBusy(false);
      setTimeout(() => setNote(""), 2500);
    }
  }

  if (!canEdit) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: active.color, display: "inline-block" }} />
        <span className="tiny">{active.label}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        {V_OPTIONS.map((o) => {
          const on = status === o.id;
          return (
            <button
              key={o.id}
              className={"btn sm " + (on ? "primary" : "ghost")}
              style={{ flex: 1, justifyContent: "center", gap: 6, borderColor: on ? o.color : undefined }}
              onClick={() => commit(o.id, override)}
              disabled={busy}
              title={o.help}
            >
              <span style={{ width: 9, height: 9, borderRadius: 5, background: o.color, display: "inline-block" }} />
              {o.label}
            </button>
          );
        })}
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={override} onChange={(e) => commit(status, e.target.checked)} disabled={busy} style={{ marginTop: 2 }} />
        <span className="tiny muted" style={{ lineHeight: 1.45 }}>
          <strong style={{ color: "var(--ink, inherit)" }}>Override</strong> — pin this status. The D1-4LS review process will not change it. Leave off to let the process set it (a cleared dual-rater reads as verified).
        </span>
      </label>

      <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.45 }}>{active.help}</div>
      {note && <div className="tiny" style={{ marginTop: 8, color: "#8fd6a8" }}>{note}</div>}
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
