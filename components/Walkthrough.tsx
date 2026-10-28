"use client";

import { useEffect, useState } from "react";

// A self-contained, replayable walkthrough. Each step shows an on-brand
// illustration (reusing the guide's SVG mocks), a title, and a line of
// narration, with Back / Next / Replay. It does not touch the live UI, so it
// stays correct regardless of layout changes and works on any screen size.

export interface WalkStep {
  tag?: string;
  title: string;
  body: string;
  art?: React.ReactNode;
}

const GOLD = "#c8a24a", BONE = "#f4f0e7", MUTED = "#8f887c";

export default function Walkthrough({
  open, onClose, title, steps,
}: { open: boolean; onClose: () => void; title: string; steps: WalkStep[] }) {
  const [i, setI] = useState(0);

  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, steps.length, onClose]);

  if (!open) return null;
  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,7,6,.74)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", background: "#1b1813", border: `1px solid ${BONE}22`, borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${BONE}14`, position: "sticky", top: 0, background: "#1b1813" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'Bodoni Moda',Georgia,serif", fontWeight: 700, fontSize: 17, color: BONE }}>{title}</span>
            <span style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>{i + 1} / {steps.length}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>&times;</button>
        </div>

        {s.art && <div style={{ padding: "18px 18px 0" }}>{s.art}</div>}

        <div style={{ padding: "16px 20px 4px" }}>
          {s.tag && <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: GOLD, fontWeight: 700, marginBottom: 6 }}>{s.tag}</div>}
          <div style={{ fontFamily: "'Bodoni Moda',Georgia,serif", fontWeight: 700, fontSize: 21, color: BONE, marginBottom: 8 }}>{s.title}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.65, color: BONE + "cc" }}>{s.body}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 20px 20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {steps.map((_, n) => (
              <button key={n} aria-label={`Go to step ${n + 1}`} onClick={() => setI(n)}
                style={{ width: n === i ? 22 : 8, height: 8, borderRadius: 8, border: "none", cursor: "pointer", padding: 0, background: n === i ? GOLD : n < i ? BONE + "66" : BONE + "2a", transition: "all .2s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {i > 0 && <button className="btn ghost sm" onClick={() => setI(i - 1)}>Back</button>}
            {!last && <button className="btn primary sm" onClick={() => setI(i + 1)}>Next</button>}
            {last && <button className="btn ghost sm" onClick={() => setI(0)}>Replay</button>}
            {last && <button className="btn primary sm" onClick={onClose}>Done</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
