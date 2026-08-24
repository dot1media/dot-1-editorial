"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { fmtClock, EPISODE_STATUS, WEEKDAYS } from "@/lib/broadcast";
import { Plus, Radio, Wrench, Calendar } from "lucide-react";

export default function BroadcastHome() {
  const { can } = useMe();
  const router = useRouter();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    const [e, t] = await Promise.all([
      api<{ episodes: any[] }>("/api/broadcast/episodes"),
      api<{ templates: any[] }>("/api/broadcast/templates"),
    ]);
    setEpisodes(e.episodes || []);
    setTemplates(t.templates || []);
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const upcoming = episodes.filter((e) => e.status === "planning" || e.status === "ready");
  const past = episodes.filter((e) => e.status === "aired" || e.status === "archived" || e.status === "live");

  return (
    <Shell title="Broadcast" subtitle="Plan the show, write the script, remember what aired."
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/broadcast/live" className="btn ghost"><Radio size={15} /> Go live</Link>
          <Link href="/broadcast/graphics" className="btn ghost"><Wrench size={15} /> On-air graphics</Link>
          <Link href="/broadcast/tools" className="btn ghost"><Wrench size={15} /> Live tools</Link>
          {can("broadcast.manage") && <button className="btn primary" onClick={() => setCreating(true)}><Plus size={15} /> New episode</button>}
        </div>
      }>
      {!loaded ? <span className="mono muted tiny">Loading…</span> : (
        <>
          {templates.length > 0 && (
            <div className="card pad" style={{ marginBottom: 18 }}>
              <div className="mini" style={{ marginBottom: 12 }}>SHOW SCHEDULE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {templates.map((t) => (
                  <div key={t.id} className="card pad" style={{ minWidth: 200 }}>
                    <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>{t.name}</div>
                    <div className="tiny muted" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={12} />
                      {t.default_weekday != null ? `${WEEKDAYS[t.default_weekday]}s` : "Ad hoc"}{t.default_time ? ` · ${t.default_time}` : ""}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>Target {fmtClock(t.target_runtime_seconds)} · {(t.segments || []).length} segments</div>
                    {can("broadcast.manage") && (
                      <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>Build episode →</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Section title="UPCOMING" episodes={upcoming} router={router} empty="No episodes planned. Create one to start building a rundown." />
          {past.length > 0 && <div style={{ height: 18 }} />}
          {past.length > 0 && <Section title="AIRED" episodes={past} router={router} empty="" />}
        </>
      )}

      {creating && <CreateEpisode templates={templates} onClose={() => setCreating(false)} onCreated={(id: string) => router.push(`/broadcast/episodes/${id}`)} />}
    </Shell>
  );
}

function Section({ title, episodes, router, empty }: any) {
  return (
    <div className="card">
      <div className="pad" style={{ borderBottom: "1px solid var(--line)" }}>
        <span className="mono tiny" style={{ letterSpacing: "0.2em", color: "var(--gold)" }}>{title}</span>
      </div>
      {episodes.length === 0 ? (
        <div className="pad muted tiny">{empty}</div>
      ) : (
        <table className="grid-t">
          <thead><tr><th>Episode</th><th>Air date</th><th>Segments</th><th>Runtime</th><th>Status</th></tr></thead>
          <tbody>
            {episodes.map((e: any) => (
              <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/broadcast/episodes/${e.id}`)}>
                <td style={{ fontWeight: 600 }}><Radio size={13} style={{ opacity: 0.5, marginRight: 7, verticalAlign: "middle" }} />{e.title}</td>
                <td className="tiny muted">{e.air_date ? new Date(e.air_date + "T00:00:00").toLocaleDateString() : "unscheduled"}{e.air_time ? ` · ${e.air_time}` : ""}</td>
                <td className="tiny">{e.segment_count}</td>
                <td className="mono tiny">{fmtClock(e.runtime_seconds)}</td>
                <td><span className={"chip" + (e.status === "aired" ? " ok" : e.status === "live" ? " crimson" : "")}>{EPISODE_STATUS.find((s) => s.id === e.status)?.label || e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CreateEpisode({ templates, onClose, onCreated }: any) {
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [airDate, setAirDate] = useState("");
  const [airTime, setAirTime] = useState(templates[0]?.default_time || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    if (!title.trim()) { setErr("Give the episode a title."); return; }
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/broadcast/episodes", {
        method: "POST",
        body: JSON.stringify({ title, templateId: templateId || null, airDate: airDate || null, airTime }),
      });
      onCreated(r.id);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="pad stack">
          <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>New episode</div>
          <div><label className="f">Title</label><input className="in" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Evening Edition — Thursday" /></div>
          <div><label className="f">Build from template</label>
            <select className="in" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Blank (ad hoc)</option>
              {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({(t.segments || []).length} segments)</option>)}
            </select>
            <div className="tiny muted" style={{ marginTop: 5 }}>A template pre-loads its segment lineup; blank starts empty.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="f">Air date</label><input className="in" type="date" value={airDate} onChange={(e) => setAirDate(e.target.value)} /></div>
            <div><label className="f">Air time</label><input className="in" value={airTime} onChange={(e) => setAirTime(e.target.value)} placeholder="18:00" /></div>
          </div>
          {err && <div className="tiny" style={{ color: "#ffb4b4" }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create and build"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
