"use client";

import { REVIEW_STATES, CLAIM_STATES, PRIORITIES, STORY_LIFECYCLE, CLASSIFICATIONS } from "@/lib/newsroom";
import { interpretTotal } from "@/lib/scoring";

const REVIEW_COLORS: Record<string, string> = {
  not_verified: "#8a8178",
  partially_verified: "#c8a24a",
  verified: "#3f8f5f",
  editor_approved: "#3f8f5f",
  ready_to_publish: "#c8a24a",
};

export function ReviewBadge({ state }: { state: string }) {
  const meta = REVIEW_STATES.find((s) => s.id === state);
  const color = REVIEW_COLORS[state] || "#8a8178";
  const gold = state === "ready_to_publish";
  return (
    <span className="pill" style={{ background: gold ? "var(--gold)" : "transparent", color: gold ? "var(--ink)" : color, border: `1px solid ${gold ? "var(--gold)" : color}` }}>
      {gold && "★ "}
      {meta?.label || state}
    </span>
  );
}

const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  routine: { bg: "transparent", fg: "var(--dim)" },
  developing: { bg: "rgba(200,162,74,.14)", fg: "var(--gold)" },
  high: { bg: "rgba(200,162,74,.2)", fg: "var(--gold)" },
  breaking: { bg: "var(--crimson)", fg: "var(--bone)" },
  emergency: { bg: "var(--crimson)", fg: "var(--bone)" },
};

export function PriorityPill({ priority }: { priority: string }) {
  const meta = PRIORITIES.find((p) => p.id === priority);
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.routine;
  return (
    <span className="pill" style={{ background: c.bg, color: c.fg, border: c.bg === "transparent" ? "1px solid var(--line)" : "none" }}>
      {(priority === "breaking" || priority === "emergency") && <span className="dot" style={{ background: "var(--bone)" }} />}
      {meta?.label || priority}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const meta = STORY_LIFECYCLE.find((s) => s.id === status);
  const isPub = status === "published";
  return <span className={"chip" + (isPub ? " ok" : "")}>{meta?.label || status}</span>;
}

export function ClassChip({ classification }: { classification: string }) {
  const meta = CLASSIFICATIONS.find((c) => c.id === classification);
  const crimson = classification === "opinion";
  const gold = classification === "analysis";
  return <span className={"chip" + (crimson ? " crimson" : gold ? " gold" : "")}>{meta?.label || classification}</span>;
}

const CLAIM_COLORS: Record<string, string> = {
  confirmed: "#3f8f5f",
  unconfirmed: "#8a8178",
  disputed: "#c8a24a",
  false: "#b81616",
};

export function ClaimPill({ status }: { status: string }) {
  const meta = CLAIM_STATES.find((s) => s.id === status);
  const color = CLAIM_COLORS[status] || "#8a8178";
  return (
    <span className="pill" style={{ color, border: `1px solid ${color}`, background: "transparent" }}>
      {meta?.label || status}
    </span>
  );
}

// Compact D1-4LS profile: the four index bars. The Handbook says read the profile, not the total,
// so the four indices are always shown together, with the total as a quiet number beside them.
export function ScoreProfile({ scores }: { scores: any }) {
  if (!scores?.totals) return <span className="muted tiny">Not scored</span>;
  const t = scores.totals;
  const rows = [
    { label: "BAI", val: t.biblicalAlignment },
    { label: "PSI", val: t.propheticSignificance },
    { label: "SCI", val: t.sourceCredibility },
    { label: "HII", val: t.humanities },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 180 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mono tiny" style={{ width: 30, color: "var(--dim)" }}>{r.label}</span>
          <div style={{ flex: 1, height: 6, background: "rgba(244,240,231,.08)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(r.val / 10) * 100}%`, height: "100%", background: "var(--gold)" }} />
          </div>
          <span className="mono tiny" style={{ width: 26, textAlign: "right" }}>{r.val}</span>
        </div>
      ))}
      <div className="mono tiny muted" style={{ marginTop: 2 }}>
        {t.total}/40 · {interpretTotal(t.total)}
      </div>
    </div>
  );
}
