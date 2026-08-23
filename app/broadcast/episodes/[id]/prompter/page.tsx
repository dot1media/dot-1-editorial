"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { segMeta, fmtClock } from "@/lib/broadcast";
import { Play, Pause, Minus, Plus, X, RotateCcw } from "lucide-react";

// A working teleprompter: the whole episode's scripts in order, big type, auto-scroll with speed
// control. Reads live from the episode, so edits in the builder show here on reload. Weather
// segments show a live-fetched forecast summary to read.
export default function Prompter() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [wx, setWx] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60); // px per second
  const [fontSize, setFontSize] = useState(42);
  const scrollRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const d = await api(`/api/broadcast/episodes/${id}`);
      setData(d);
      const ep = d.episode;
      if (ep.weather_lat != null && ep.weather_lng != null) {
        try {
          const qs = new URLSearchParams({ lat: String(ep.weather_lat), lng: String(ep.weather_lng), location: ep.weather_location || "" });
          const w = await api<{ weather: any }>(`/api/broadcast/weather?${qs.toString()}`);
          setWx(w.weather);
        } catch { /* forecast optional in prompter */ }
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!playing) { if (raf.current) cancelAnimationFrame(raf.current); return; }
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      if (scrollRef.current) scrollRef.current.scrollTop += speed * dt;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, speed]);

  if (!data) return <div style={{ background: "#000", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }} className="mono">Loading…</div>;

  const segs = data.segments as any[];

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Control bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #222", background: "#0a0a0a" }}>
        <button className="btn gold sm" onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Roll"}</button>
        <button className="btn ghost sm" onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; setPlaying(false); }}><RotateCcw size={13} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="mono tiny" style={{ color: "#888" }}>SPEED</span>
          <button className="btn ghost sm" onClick={() => setSpeed((s) => Math.max(15, s - 15))}><Minus size={12} /></button>
          <span className="mono tiny" style={{ width: 34, textAlign: "center" }}>{speed}</span>
          <button className="btn ghost sm" onClick={() => setSpeed((s) => Math.min(240, s + 15))}><Plus size={12} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="mono tiny" style={{ color: "#888" }}>SIZE</span>
          <button className="btn ghost sm" onClick={() => setFontSize((s) => Math.max(24, s - 4))}><Minus size={12} /></button>
          <button className="btn ghost sm" onClick={() => setFontSize((s) => Math.min(80, s + 4))}><Plus size={12} /></button>
        </div>
        <div style={{ flex: 1 }} />
        <span className="mono tiny" style={{ color: "#888" }}>{data.episode.title}</span>
        <button className="btn ghost sm" onClick={() => router.push(`/broadcast/episodes/${id}`)}><X size={14} /></button>
      </div>

      {/* Center read line */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "38%", left: 0, right: 0, height: 2, background: "rgba(200,162,74,.5)", zIndex: 2, pointerEvents: "none" }} />
        <div ref={scrollRef} style={{ height: "100%", overflowY: "auto", padding: "38vh 8% 60vh", scrollBehavior: "auto" }}>
          {segs.map((s, i) => {
            const meta = segMeta(s.type);
            const script = s.script || (s.story_id && data.stories[s.story_id]?.body) || "";
            return (
              <div key={s.id} style={{ marginBottom: 80 }}>
                <div className="mono" style={{ fontSize: 15, color: "var(--gold)", letterSpacing: "0.14em", marginBottom: 14, textTransform: "uppercase" }}>
                  {i + 1} · {meta.label} · {fmtClock(s.est_seconds)}{s.lower_third_name ? ` · L3: ${s.lower_third_name}` : ""}
                </div>
                <div style={{ fontFamily: "Archivo, sans-serif", fontSize, lineHeight: 1.5, fontWeight: 500 }}>
                  {s.type === "weather" && wx ? (
                    <div>
                      Now {wx.currentTemp} degrees and {wx.currentLabel.toLowerCase()} in {wx.location}.{" "}
                      {wx.days[0] && `Today, a high near ${wx.days[0].hi}, low around ${wx.days[0].lo}.`}{" "}
                      {wx.days[1] && `Tomorrow, ${wx.days[1].label.toLowerCase()}, ${wx.days[1].hi} degrees.`}
                    </div>
                  ) : s.type === "weather" ? (
                    <div style={{ color: "#c8a24a" }}>[ Weather forecast will read here once a location with coordinates is set on the episode ]</div>
                  ) : script ? (
                    script.split(/\n\s*\n/).map((p: string, j: number) => <p key={j} style={{ margin: "0 0 24px" }}>{p}</p>)
                  ) : (
                    <div style={{ color: "#555" }}>[ No script yet for this segment ]</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
