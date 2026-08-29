"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { STORY_LIFECYCLE, CLASSIFICATIONS, CATEGORIES, PRIORITIES } from "@/lib/newsroom";
import { ReviewBadge, PriorityPill, StatusChip, ClassChip } from "@/components/ui";
import { Plus } from "lucide-react";

function StoriesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useMe();
  const statusFilter = params.get("status") || "";
  const [stories, setStories] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    if (q) qs.set("q", q);
    const data = await api<{ stories: any[] }>(`/api/stories?${qs.toString()}`);
    setStories(data.stories || []);
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <Shell
      title="Stories"
      subtitle="Every potential story is a record here."
      actions={can("story.create") ? <button className="btn primary" onClick={() => setCreating(true)}><Plus size={15} /> New story</button> : undefined}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className={"btn sm" + (!statusFilter ? " gold" : " ghost")} onClick={() => router.push("/stories")}>All</button>
        {STORY_LIFECYCLE.map((s) => (
          <button key={s.id} className={"btn sm" + (statusFilter === s.id ? " gold" : " ghost")} onClick={() => router.push(`/stories?status=${s.id}`)}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input className="in" placeholder="Search headlines…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} style={{ maxWidth: 320 }} />
        <button className="btn ghost sm" onClick={load}>Search</button>
      </div>

      <div className="card">
        {!loaded ? (
          <div className="pad muted tiny">Loading…</div>
        ) : stories.length === 0 ? (
          <div className="pad muted tiny">No stories match. {can("story.create") && "Create one to begin."}</div>
        ) : (
          <div className="table-wrap"><table className="grid-t">
            <thead>
              <tr><th>Headline</th><th>Class</th><th>Status</th><th>Priority</th><th>Review</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {stories.map((s) => (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/stories/${s.id}`)}>
                  <td style={{ fontWeight: 600, maxWidth: 340 }}>
                    {s.final_headline || s.working_headline}
                    {Array.isArray(s.flags) && s.flags.length > 0 && (
                      <span style={{ marginLeft: 8 }}>
                        {s.flags.map((f: string) => <span key={f} className="chip crimson" style={{ marginRight: 4 }}>{f.replace(/_/g, " ")}</span>)}
                      </span>
                    )}
                  </td>
                  <td><ClassChip classification={s.classification} /></td>
                  <td><StatusChip status={s.status} /></td>
                  <td><PriorityPill priority={s.priority} /></td>
                  <td><ReviewBadge state={s.review_state} /></td>
                  <td className="tiny muted">{new Date(s.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={(id) => router.push(`/stories/${id}`)} />}
    </Shell>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [headline, setHeadline] = useState("");
  const [classification, setClassification] = useState("news");
  const [category, setCategory] = useState("world");
  const [priority, setPriority] = useState("routine");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    if (!headline.trim()) { setErr("A working headline is required."); return; }
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/stories", {
        method: "POST",
        body: JSON.stringify({ workingHeadline: headline, classification, category, priority, location }),
      });
      onCreated(r.id);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="pad">
          <div className="disp" style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>New story</div>
          <label className="f">Working headline</label>
          <input className="in" value={headline} onChange={(e) => setHeadline(e.target.value)} autoFocus style={{ marginBottom: 14 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label className="f">Classification</label>
              <select className="in" value={classification} onChange={(e) => setClassification(e.target.value)}>
                {CLASSIFICATIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="f">Category</label>
              <select className="in" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="f">Priority</label>
              <select className="in" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="f">Location</label>
              <input className="in" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Wasilla, AK" />
            </div>
          </div>
          {err && <div className="tiny" style={{ color: "#ffb4b4", marginBottom: 12 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create story"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoriesPage() {
  return (
    <Suspense fallback={null}>
      <StoriesInner />
    </Suspense>
  );
}
