"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { CLASSIFICATIONS, CATEGORIES, PRIORITIES } from "@/lib/newsroom";
import type { Capability } from "@/lib/permissions";

export default function StoryTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const s = data.story;
  const editable = can("story.edit");
  const [f, setF] = useState({
    workingHeadline: s.working_headline || "",
    finalHeadline: s.final_headline || "",
    summary: s.summary || "",
    body: s.body || "",
    classification: s.classification || "news",
    category: s.category || "world",
    priority: s.priority || "routine",
    location: s.location || "",
    heroImage: s.hero_image || "",
    whyPublish: s.why_publish || "",
  });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) { setF((p) => ({ ...p, [k]: v })); setSaved(false); }

  async function save() {
    setBusy(true);
    try {
      await api(`/api/stories/${s.id}`, { method: "PATCH", body: JSON.stringify(f) });
      setSaved(true);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="card pad stack">
        <div>
          <label className="f">Working headline</label>
          <input className="in" value={f.workingHeadline} disabled={!editable} onChange={(e) => set("workingHeadline", e.target.value)} />
        </div>
        <div>
          <label className="f">Final headline <span className="muted">(what publishes)</span></label>
          <input className="in" value={f.finalHeadline} disabled={!editable} onChange={(e) => set("finalHeadline", e.target.value)} placeholder="Set when the headline is locked" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label className="f">Classification</label>
            <select className="in" value={f.classification} disabled={!editable} onChange={(e) => set("classification", e.target.value)}>
              {CLASSIFICATIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="f">Category</label>
            <select className="in" value={f.category} disabled={!editable} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="f">Priority</label>
            <select className="in" value={f.priority} disabled={!editable} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label className="f">Location</label><input className="in" value={f.location} disabled={!editable} onChange={(e) => set("location", e.target.value)} /></div>
          <div><label className="f">Hero image URL</label><input className="in" value={f.heroImage} disabled={!editable} onChange={(e) => set("heroImage", e.target.value)} /></div>
        </div>
      </div>

      <div className="card pad stack">
        <div>
          <label className="f">Summary</label>
          <textarea className="in" value={f.summary} disabled={!editable} onChange={(e) => set("summary", e.target.value)} style={{ minHeight: 70 }} />
        </div>
        <div>
          <label className="f">Body</label>
          <textarea className="in" value={f.body} disabled={!editable} onChange={(e) => set("body", e.target.value)} style={{ minHeight: 260 }} />
        </div>
      </div>

      <div className="card pad">
        <label className="f">Why this deserves attention today <span className="muted">(the Fourth Turning; publishes with the story)</span></label>
        <textarea className="in" value={f.whyPublish} disabled={!editable} onChange={(e) => set("whyPublish", e.target.value)} style={{ minHeight: 60 }} placeholder="One honest sentence about why this is worth a reader's time." />
      </div>

      {editable && (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          {saved && <span className="tiny" style={{ color: "#8fd6a8" }}>Saved.</span>}
        </div>
      )}
    </div>
  );
}
