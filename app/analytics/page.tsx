"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";
import { Eye, Users, Smartphone, Radio } from "lucide-react";

export default function AnalyticsPage() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<any>("/api/analytics").then(setD).catch((e) => setErr(e.message || "Could not load.")); }, []);

  if (err) return <Shell title="Readership"><div className="tiny" style={{ color: "#ffb4b4" }}>{err}</div></Shell>;
  if (!d) return <Shell title="Readership"><span className="mono muted tiny">Loading…</span></Shell>;

  const maxDau = Math.max(1, ...(d.dau || []).map((x: any) => x.readers));

  return (
    <Shell title="Readership" subtitle="First-party, anonymous. No third-party trackers.">
      {!d.hasData && (
        <div className="card pad tiny muted" style={{ marginBottom: 16 }}>
          No reader activity yet. Numbers appear here once the app with analytics is in people's hands.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        <Kpi icon={<Eye size={16} />} label="Reads · 7 days" value={d.reads7} sub={`${d.reads30} in 30 days`} />
        <Kpi icon={<Users size={16} />} label="Readers · 7 days" value={d.readers7} sub="unique devices" />
        <Kpi icon={<Smartphone size={16} />} label="App opens · 7 days" value={d.appOpens7} />
        <Kpi icon={<Radio size={16} />} label="Live tune-ins · 30 days" value={d.liveViews30} sub={d.episodeViews30 ? `${d.episodeViews30} episode views` : undefined} />
      </div>

      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="mini" style={{ marginBottom: 12 }}>READERS PER DAY · LAST 14 DAYS</div>
        {(d.dau || []).length === 0 ? <div className="tiny muted">No data yet.</div> : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
            {d.dau.map((x: any) => (
              <div key={x.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: `${(x.readers / maxDau) * 96}px`, minHeight: x.readers ? 3 : 0, background: "var(--gold,#c8a24a)", borderRadius: "3px 3px 0 0" }} title={`${x.readers} readers`} />
                <div className="tiny muted" style={{ fontSize: 9 }}>{x.day}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card pad">
        <div className="mini" style={{ marginBottom: 12 }}>MOST-READ STORIES · LAST 30 DAYS</div>
        {(d.topStories || []).length === 0 ? <div className="tiny muted">No reads yet.</div> : (
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
            {d.topStories.map((s: any) => (
              <li key={s.id} style={{ fontSize: 14 }}>
                <span>{s.title || <span className="muted">(removed story)</span>}</span>
                <span className="mono muted tiny" style={{ marginLeft: 8 }}>{s.views} {s.views === 1 ? "read" : "reads"}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Shell>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="card pad">
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted,#8f887c)" }}>{icon}<span className="mini">{label}</span></div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6, fontFamily: "var(--display,Georgia,serif)" }}>{value.toLocaleString()}</div>
      {sub && <div className="tiny muted">{sub}</div>}
    </div>
  );
}
