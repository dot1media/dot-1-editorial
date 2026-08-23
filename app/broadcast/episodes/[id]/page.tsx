"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { SEGMENT_TYPES, segMeta, fmtClock, runtimes, EPISODE_STATUS } from "@/lib/broadcast";
import { Plus, GripVertical, Trash2, ChevronUp, ChevronDown, Cloud, Tv, Play, Link2 } from "lucide-react";

export default function EpisodeBuilder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useMe();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const manage = can("broadcast.manage");

  const load = useCallback(async () => {
    try { setData(await api(`/api/broadcast/episodes/${id}`)); }
    catch (e: any) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (err) return <Shell title="Episode"><div className="card pad" style={{ color: "#ffb4b4" }}>{err}</div></Shell>;
  if (!data) return <Shell title="Episode"><span className="mono muted tiny">Loading…</span></Shell>;

  const ep = data.episode;
  const segs = data.segments as any[];
  const { starts, total } = runtimes(segs);
  const target = data.episode.template_id ? null : null;

  async function addSegment(type: string) {
    await api(`/api/broadcast/episodes/${id}/segments`, { method: "POST", body: JSON.stringify({ type }) });
    load();
  }
  async function move(idx: number, dir: -1 | 1) {
    const order = segs.map((s) => s.id);
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j], order[idx]];
    await api(`/api/broadcast/episodes/${id}/segments`, { method: "PATCH", body: JSON.stringify({ order }) });
    load();
  }
  async function setStatus(status: string) {
    await api(`/api/broadcast/episodes/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  const sel = segs.find((s) => s.id === selected) || null;

  return (
    <Shell title={ep.title} subtitle={`${ep.air_date ? new Date(ep.air_date + "T00:00:00").toLocaleDateString() : "unscheduled"}${ep.air_time ? " · " + ep.air_time : ""}`}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/broadcast/episodes/${id}/prompter`} className="btn ghost"><Tv size={15} /> Teleprompter</Link>
          {manage && ep.status !== "aired" && <button className="btn gold" onClick={() => setStatus(ep.status === "live" ? "aired" : "live")}><Play size={14} /> {ep.status === "live" ? "Mark aired" : "Go live"}</button>}
        </div>
      }>

      <div className="row-between" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className={"chip" + (ep.status === "aired" ? " ok" : ep.status === "live" ? " crimson" : "")}>{EPISODE_STATUS.find((s) => s.id === ep.status)?.label}</span>
          <span className="mono tiny muted">RUNTIME</span>
          <span className="disp" style={{ fontSize: 22, fontWeight: 700 }}>{fmtClock(total)}</span>
          <span className="tiny muted">{segs.length} segments</span>
        </div>
        <button className="btn ghost sm" onClick={() => router.push("/broadcast")}>← All episodes</button>
      </div>

      <div className="work">
        <div>
          {/* Rundown */}
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="grid-t">
              <thead><tr><th style={{ width: 34 }}></th><th style={{ width: 60 }}>Start</th><th>Segment</th><th style={{ width: 90 }}>Type</th><th style={{ width: 64 }}>Est</th><th style={{ width: 70 }}></th></tr></thead>
              <tbody>
                {segs.map((s, i) => {
                  const meta = segMeta(s.type);
                  const linked = s.story_id && data.stories[s.story_id];
                  return (
                    <tr key={s.id} onClick={() => setSelected(s.id)} style={{ cursor: "pointer", background: selected === s.id ? "rgba(200,162,74,.08)" : undefined }}>
                      <td className="mono tiny muted" style={{ textAlign: "center" }}>{i + 1}</td>
                      <td className="mono tiny muted">{fmtClock(starts[i])}</td>
                      <td>
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                          {s.type === "weather" && <Cloud size={13} color="var(--gold)" />}
                          {linked && <Link2 size={12} color="var(--gold)" />}
                          {s.title}
                        </div>
                        {linked && <div className="tiny muted" style={{ marginTop: 2 }}>{data.stories[s.story_id].review_state?.replace(/_/g, " ")}</div>}
                      </td>
                      <td><span className="chip">{meta.label}</span></td>
                      <td className="mono tiny">{fmtClock(s.est_seconds)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {manage && (
                          <div style={{ display: "flex", gap: 2 }}>
                            <button className="btn ghost sm" style={{ padding: 4 }} onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={13} /></button>
                            <button className="btn ghost sm" style={{ padding: 4 }} onClick={() => move(i, 1)} disabled={i === segs.length - 1}><ChevronDown size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {segs.length === 0 && <tr><td colSpan={6} className="pad muted tiny">No segments yet. Add one below.</td></tr>}
              </tbody>
            </table>
          </div>

          {manage && (
            <div className="card pad" style={{ marginTop: 12 }}>
              <div className="mini" style={{ marginBottom: 10 }}>ADD SEGMENT</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SEGMENT_TYPES.map((t) => (
                  <button key={t.id} className="btn ghost sm" onClick={() => addSegment(t.id)} title={t.blurb}><Plus size={12} /> {t.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div style={{ position: "sticky", top: 90 }}>
          {sel ? (
            <SegmentInspector key={sel.id} segment={sel} episode={ep} stories={data.stories} manage={manage} reload={load} />
          ) : (
            <div className="card pad muted tiny">Select a segment to edit its script, timing, lower-third, and story link.</div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function SegmentInspector({ segment, episode, stories, manage, reload }: any) {
  const meta = segMeta(segment.type);
  const [f, setF] = useState({
    title: segment.title || "", estSeconds: segment.est_seconds || 0,
    script: segment.script || "", lowerThirdName: segment.lower_third_name || "",
    lowerThirdTitle: segment.lower_third_title || "", notes: segment.notes || "",
  });
  const [saved, setSaved] = useState(false);
  const linkedStory = segment.story_id && stories[segment.story_id];

  function set(k: string, v: any) { setF((p) => ({ ...p, [k]: v })); setSaved(false); }

  async function save() {
    await api(`/api/broadcast/segments/${segment.id}`, { method: "PATCH", body: JSON.stringify(f) });
    setSaved(true); reload();
  }
  async function del() {
    if (!confirm("Remove this segment?")) return;
    await api(`/api/broadcast/segments/${segment.id}`, { method: "DELETE" });
    reload();
  }
  async function pullScript() {
    if (!linkedStory) return;
    set("script", linkedStory.body || "");
  }
  async function linkStory(storyId: string | null) {
    await api(`/api/broadcast/segments/${segment.id}`, { method: "PATCH", body: JSON.stringify({ storyId }) });
    reload();
  }

  return (
    <div className="card pad stack">
      <div className="row-between">
        <span className="mini">{meta.label}</span>
        {manage && <button className="btn ghost sm" onClick={del}><Trash2 size={13} /></button>}
      </div>

      {segment.type === "weather" ? (
        <WeatherPanel episode={episode} />
      ) : (
        <>
          <div><label className="f">Segment title</label><input className="in" value={f.title} disabled={!manage} onChange={(e) => set("title", e.target.value)} /></div>
          {linkedStory ? (
            <div className="card pad" style={{ background: "rgba(200,162,74,.06)" }}>
              <div className="tiny" style={{ fontWeight: 600 }}>Linked story</div>
              <div className="tiny muted" style={{ marginTop: 3 }}>{linkedStory.final_headline || linkedStory.working_headline}</div>
              <div className="tiny muted" style={{ marginTop: 2 }}>{linkedStory.review_state?.replace(/_/g, " ")}</div>
              {manage && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn ghost sm" onClick={pullScript}>Pull story body into script</button>
                  <button className="btn ghost sm" onClick={() => linkStory(null)}>Unlink</button>
                </div>
              )}
            </div>
          ) : manage && meta.storyBacked ? (
            <StoryPicker onPick={(sid: string) => linkStory(sid)} />
          ) : null}
          <div>
            <label className="f">Estimated duration (seconds)</label>
            <input className="in" type="number" value={f.estSeconds} disabled={!manage} onChange={(e) => set("estSeconds", Number(e.target.value))} />
            <div className="tiny muted" style={{ marginTop: 4 }}>= {fmtClock(f.estSeconds)}</div>
          </div>
          <div><label className="f">Teleprompter script</label><textarea className="in" value={f.script} disabled={!manage} onChange={(e) => set("script", e.target.value)} style={{ minHeight: 140 }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="f">Lower-third name</label><input className="in" value={f.lowerThirdName} disabled={!manage} onChange={(e) => set("lowerThirdName", e.target.value)} /></div>
            <div><label className="f">Lower-third title</label><input className="in" value={f.lowerThirdTitle} disabled={!manage} onChange={(e) => set("lowerThirdTitle", e.target.value)} /></div>
          </div>
          {(f.lowerThirdName || f.lowerThirdTitle) && (
            <div className="card pad" style={{ background: "rgba(200,162,74,.06)" }}>
              <div className="mini" style={{ marginBottom: 6 }}>PREPARED GRAPHIC · FOR OBS</div>
              <div style={{ fontWeight: 700 }}>{f.lowerThirdName}</div>
              <div className="tiny muted">{f.lowerThirdTitle}</div>
              <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => navigator.clipboard?.writeText(`${f.lowerThirdName}\n${f.lowerThirdTitle}`)}>Copy for overlay dock</button>
            </div>
          )}
          <div><label className="f">Producer notes</label><textarea className="in" value={f.notes} disabled={!manage} onChange={(e) => set("notes", e.target.value)} style={{ minHeight: 48 }} /></div>
          {manage && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn primary sm" onClick={save}>Save segment</button>
              {saved && <span className="tiny" style={{ color: "#8fd6a8" }}>Saved.</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WeatherPanel({ episode }: any) {
  const [wx, setWx] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function fetchWx() {
    setBusy(true); setErr("");
    try {
      if (episode.weather_lat == null || episode.weather_lng == null) { setErr("Set a weather location on the episode first."); setBusy(false); return; }
      const qs = new URLSearchParams({ lat: String(episode.weather_lat), lng: String(episode.weather_lng), location: episode.weather_location || "" });
      const d = await api<{ weather: any }>(`/api/broadcast/weather?${qs.toString()}`);
      setWx(d.weather);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { fetchWx(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="stack">
      <div className="tiny muted" style={{ lineHeight: 1.5 }}>Live forecast for {episode.weather_location || "the episode location"}, fetched now. The anchor reads real numbers, never stale ones.</div>
      {busy && <span className="mono tiny muted">Fetching forecast…</span>}
      {err && <div className="tiny" style={{ color: "#ffb4b4" }}>{err}</div>}
      {wx && (
        <div>
          <div className="card pad" style={{ marginBottom: 10 }}>
            <div className="disp" style={{ fontSize: 30, fontWeight: 700 }}>{wx.currentTemp}°</div>
            <div className="tiny muted">{wx.currentLabel} · {wx.location}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
            {wx.days.map((d: any) => (
              <div key={d.date} className="card pad" style={{ textAlign: "center", padding: "10px 6px" }}>
                <div className="mono tiny muted">{new Date(d.date + "T00:00:00").toLocaleDateString([], { weekday: "short" })}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{d.hi}°</div>
                <div className="tiny muted">{d.lo}°</div>
                <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.2 }}>{d.label}</div>
                {d.precip > 0 && <div className="tiny" style={{ color: "var(--gold)", marginTop: 3 }}>{d.precip}%</div>}
              </div>
            ))}
          </div>
          <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={fetchWx}>Refresh forecast</button>
          <div className="tiny muted" style={{ marginTop: 6 }}>Fetched {new Date(wx.fetchedAt).toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
}

function StoryPicker({ onPick }: { onPick: (id: string) => void }) {
  const [stories, setStories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    api<{ stories: any[] }>("/api/stories").then((d) => setStories(d.stories || [])).catch(() => {});
  }, [open]);
  if (!open) return <button className="btn ghost sm" onClick={() => setOpen(true)}><Link2 size={13} /> Link a story</button>;
  return (
    <div className="card pad" style={{ maxHeight: 260, overflowY: "auto" }}>
      <div className="mini" style={{ marginBottom: 8 }}>LINK A STORY</div>
      {stories.length === 0 ? <div className="tiny muted">No stories.</div> : stories.map((s) => (
        <button key={s.id} className="btn ghost sm" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4, textAlign: "left" }} onClick={() => onPick(s.id)}>
          {s.final_headline || s.working_headline}
        </button>
      ))}
      <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
