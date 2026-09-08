"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";

type Item = { id: string; title: string; kind: "due" | "scheduled" | "published"; at: Date };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const COLORS: Record<Item["kind"], { bg: string; fg: string; label: string }> = {
  due: { bg: "var(--crimson, #b81616)", fg: "var(--bone, #f4f0e7)", label: "Deadline" },
  scheduled: { bg: "var(--gold, #c8a24a)", fg: "var(--ink, #141210)", label: "Scheduled" },
  published: { bg: "transparent", fg: "inherit", label: "Published" },
};

export default function CalendarPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  useEffect(() => {
    Promise.all([api<{ stories: any[] }>("/api/stories").catch(() => ({ stories: [] })), api<{ stories: any[] }>("/api/stories?status=published").catch(() => ({ stories: [] }))])
      .then(([a, b]) => { const seen = new Set<string>(); const all: any[] = []; for (const s of [...(a.stories || []), ...(b.stories || [])]) { if (!seen.has(s.id)) { seen.add(s.id); all.push(s); } } setStories(all); });
  }, []);
  const items = useMemo(() => {
    const out: Record<string, Item[]> = {};
    const push = (it: Item) => { const k = key(it.at); (out[k] ||= []).push(it); };
    for (const s of stories) {
      const title = s.final_headline || s.working_headline || "Untitled";
      const active = !["published", "archived"].includes(s.status);
      if (active && s.deadline) { const d = new Date(s.deadline); if (!isNaN(d.getTime())) push({ id: s.id, title, kind: "due", at: d }); }
      if (active && s.planned_publish_at) { const d = new Date(s.planned_publish_at); if (!isNaN(d.getTime())) push({ id: s.id, title, kind: "scheduled", at: d }); }
      if (s.status === "published" && s.published_at) { const d = new Date(s.published_at); if (!isNaN(d.getTime())) push({ id: s.id, title, kind: "published", at: d }); }
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.at.getTime() - b.at.getTime());
    return out;
  }, [stories]);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const today = key(new Date());
  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const counts = { due: 0, scheduled: 0, published: 0 };
  for (const d of cells) if (d) for (const it of items[key(d)] || []) counts[it.kind]++;

  return (
    <Shell title="Editorial calendar" subtitle="Deadlines, scheduled publishes, and what went out, by day.">
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">&larr;</button>
            <strong style={{ fontSize: 16, minWidth: 170, textAlign: "center" }}>{monthLabel}</strong>
            <button className="btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">&rarr;</button>
            <button className="btn" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }}>Today</button>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 12, opacity: 0.85 }}>
            {(Object.keys(COLORS) as Item["kind"][]).map((k) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[k].bg, border: COLORS[k].bg === "transparent" ? "1px solid var(--line)" : "none" }} />{COLORS[k].label} ({counts[k]})</span>)}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {DAYS.map((d) => <div key={d} style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6, padding: "4px 6px" }}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={"e" + i} style={{ minHeight: 84, borderRadius: 8, background: "transparent" }} />;
            const k = key(d); const list = items[k] || []; const isToday = k === today;
            return (
              <div key={k} style={{ minHeight: 84, borderRadius: 8, border: `1px solid ${isToday ? "var(--gold, #c8a24a)" : "var(--line)"}`, padding: 6, display: "flex", flexDirection: "column", gap: 4, background: isToday ? "rgba(200,162,74,0.08)" : "transparent" }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, opacity: 0.85 }}>{d.getDate()}</div>
                {list.slice(0, 4).map((it, j) => (
                  <Link key={it.id + it.kind + j} href={`/stories/${it.id}`} title={`${COLORS[it.kind].label} \u00b7 ${it.at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} \u00b7 ${it.title}`} style={{ fontSize: 11, lineHeight: 1.25, padding: "3px 6px", borderRadius: 5, background: COLORS[it.kind].bg, color: COLORS[it.kind].fg, border: COLORS[it.kind].bg === "transparent" ? "1px solid var(--line)" : "none", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{it.title}</Link>
                ))}
                {list.length > 4 && <div style={{ fontSize: 10.5, opacity: 0.6 }}>+{list.length - 4} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
