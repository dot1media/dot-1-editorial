"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// A live, replayable coach-mark tour. It finds real elements on the page by
// selector, spotlights each one, and shows a tooltip with Back / Next. If a
// target is not on screen (e.g. a collapsed sidebar on mobile), the step still
// explains what that area does rather than breaking the tour.

export interface TourStep {
  selector: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

const GOLD = "#c8a24a", BONE = "#f4f0e7", MUTED = "#8f887c";
const TW = 310;

export default function UITour({
  open, onClose, steps, title,
}: { open: boolean; onClose: () => void; steps: TourStep[]; title?: string }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => { if (open) setI(0); }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const step = steps[i];
    const el = step ? (document.querySelector(step.selector) as HTMLElement | null) : null;
    if (!el) { setMissing(true); setRect(null); return; }
    setMissing(false);
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const t = setTimeout(() => setRect(el.getBoundingClientRect()), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i]);

  useEffect(() => {
    if (!open) return;
    const reflow = () => {
      const step = steps[i];
      const el = step ? (document.querySelector(step.selector) as HTMLElement | null) : null;
      if (el) setRect(el.getBoundingClientRect());
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("resize", reflow);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", reflow);
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i]);

  if (!open) return null;
  const step = steps[i];
  const last = i === steps.length - 1;
  const next = () => (last ? onClose() : setI(i + 1));
  const prev = () => setI(Math.max(0, i - 1));

  const pad = 6;
  const box = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  const clampX = (x: number) => Math.max(12, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - TW - 12));
  let tip = { left: 20, top: 20 };
  if (box) {
    const vh = window.innerHeight, place = step.placement || "auto";
    const below = box.top + box.height + 12;
    if (place === "right") tip = { left: Math.min(box.left + box.width + 12, window.innerWidth - TW - 12), top: Math.max(12, box.top) };
    else if (place === "left") tip = { left: Math.max(12, box.left - TW - 12), top: Math.max(12, box.top) };
    else if (place === "top" || (place === "auto" && below > vh - 170)) tip = { left: clampX(box.left), top: Math.max(12, box.top - 156) };
    else tip = { left: clampX(box.left), top: below };
  } else {
    tip = { left: clampX((typeof window !== "undefined" ? window.innerWidth : 1200) / 2 - TW / 2), top: 90 };
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      {/* full-screen click guard: blocks clicks reaching the app and dims when nothing is spotlighted */}
      <div style={{ position: "absolute", inset: 0, background: box ? "transparent" : "rgba(8,7,6,.64)" }} />
      {box && (
        <div style={{ position: "fixed", left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: 10, boxShadow: "0 0 0 9999px rgba(8,7,6,.68)", border: `2px solid ${GOLD}`, pointerEvents: "none", transition: "all .2s ease" }} />
      )}
      <div style={{ position: "fixed", left: tip.left, top: tip.top, width: TW, background: "#1b1813", border: `1px solid ${BONE}22`, borderRadius: 12, padding: "14px 16px", boxShadow: "0 18px 50px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>{title ? title + " · " : ""}{i + 1}/{steps.length}</span>
          <button onClick={onClose} aria-label="End tour" style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>&times;</button>
        </div>
        <div style={{ fontFamily: "'Bodoni Moda',Georgia,serif", fontWeight: 700, fontSize: 17, color: BONE, marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: BONE + "cc", marginBottom: 12 }}>
          {missing ? "Not on screen right now, but here is what it does: " + step.body : step.body}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <button onClick={onClose} style={{ fontSize: 12, color: MUTED, background: "transparent", border: "none", cursor: "pointer" }}>Skip</button>
          <div style={{ display: "flex", gap: 8 }}>
            {i > 0 && <button className="btn ghost sm" onClick={prev}>Back</button>}
            <button className="btn primary sm" onClick={next}>{last ? "Done" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
