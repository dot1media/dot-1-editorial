"use client";

import { api } from "@/lib/client";
import { REVIEW_ITEMS, reviewProgress } from "@/lib/newsroom";
import { ReviewBadge } from "@/components/ui";
import type { Capability } from "@/lib/permissions";
import { Check } from "lucide-react";

export default function ReviewTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const items = (data.checklist?.items || {}) as Record<string, boolean>;
  const prog = reviewProgress(items);
  const canToggle = can("review.complete");
  const canApprove = can("review.approve");
  const approved = !!data.checklist?.approved_by;

  async function toggle(id: string, value: boolean) {
    if (!canToggle) return;
    await api(`/api/stories/${data.story.id}/review`, { method: "POST", body: JSON.stringify({ action: "toggle", item: id, value }) });
    reload();
  }
  async function approve(on: boolean) {
    await api(`/api/stories/${data.story.id}/review`, { method: "POST", body: JSON.stringify({ action: on ? "approve" : "unapprove" }) });
    reload();
  }

  return (
    <div className="stack">
      <div className="card pad row-between">
        <div>
          <div className="mini">EDITORIAL REVIEW</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>{prog.done} of {prog.total} checks complete</div>
        </div>
        <ReviewBadge state={data.story.review_state} />
      </div>

      <div className="card pad">
        {REVIEW_ITEMS.map((it) => {
          const done = items[it.id] === true;
          return (
            <div key={it.id} className={"check" + (done ? " done" : "")} onClick={() => toggle(it.id, !done)} style={{ cursor: canToggle ? "pointer" : "default" }}>
              <div className="box">{done && <Check size={13} color="#fff" strokeWidth={3} />}</div>
              <div className="lbl">{it.label}</div>
            </div>
          );
        })}
      </div>

      <div className="card pad">
        <div className="mini" style={{ marginBottom: 10 }}>EDITOR APPROVAL</div>
        {approved ? (
          <div>
            <div className="tiny" style={{ color: "#8fd6a8" }}>Approved by {data.checklist.approved_by} · {new Date(data.checklist.approved_at).toLocaleString()}</div>
            {canApprove && <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => approve(false)}>Withdraw approval</button>}
          </div>
        ) : (
          <div>
            <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>
              Approval is a human act. A story reaches Ready to Publish only when the checklist is complete and an editor has approved it.
            </div>
            {canApprove ? (
              <button className="btn gold" onClick={() => approve(true)} disabled={!prog.done}>Approve this story</button>
            ) : (
              <span className="tiny muted">You do not have approval permission.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
