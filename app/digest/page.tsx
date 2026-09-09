"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";

const NEWS = "https://news.dot1.media";
const storyUrl = (s: any) => (s.news_story_id ? `${NEWS}/s/n/${s.news_story_id}` : NEWS);
const esc = (t: string) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function DigestPage() {
  const [all, setAll] = useState<any[]>([]);
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 7 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("This week from Dot 1 News");
  const [intro, setIntro] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => { api<{ stories: any[] }>("/api/stories?status=published").then((d) => setAll(d.stories || [])).catch(() => {}); }, []);
  const inRange = useMemo(() => all.filter((s) => { const p = s.published_at ? String(s.published_at).slice(0, 10) : ""; return p && p >= from && p <= to; }).sort((a, b) => String(b.published_at).localeCompare(String(a.published_at))), [all, from, to]);
  useEffect(() => { setPicked(new Set(inRange.map((s) => s.id))); }, [inRange]);
  const chosen = inRange.filter((s) => picked.has(s.id));
  const html = useMemo(() => {
    const items = chosen.map((s) => `
      <tr><td style="padding:16px 0;border-top:1px solid #e2ded4">
        ${s.hero_image ? `<a href="${storyUrl(s)}"><img src="${esc(s.hero_image)}" alt="" width="560" style="display:block;width:100%;max-width:560px;border-radius:8px;margin-bottom:10px"/></a>` : ""}
        <div style="font-family:Georgia,'Bodoni Moda',serif;font-size:20px;font-weight:700;color:#141210;line-height:1.25"><a href="${storyUrl(s)}" style="color:#141210;text-decoration:none">${esc(s.final_headline || s.working_headline)}</a></div>
        ${s.summary ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#33322d;line-height:1.55;margin-top:6px">${esc(s.summary)}</div>` : ""}
        <div style="margin-top:8px"><a href="${storyUrl(s)}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#b81616;text-decoration:none;font-weight:700">Read the story &rarr;</a></div>
      </td></tr>`).join("");
    return `<!doctype html><html><body style="margin:0;background:#f4f0e7;padding:24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fbf8f2;border-radius:12px;padding:28px 24px">
  <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6f6d65">Dot 1 News &middot; ${esc(from)} to ${esc(to)}</td></tr>
  <tr><td style="font-family:Georgia,'Bodoni Moda',serif;font-size:28px;font-weight:700;color:#141210;padding:6px 0 4px">${esc(title)}</td></tr>
  ${intro ? `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#33322d;line-height:1.6;padding:6px 0 10px">${esc(intro).replace(/\n/g, "<br/>")}</td></tr>` : ""}
  ${items}
  <tr><td style="padding-top:18px;border-top:1px solid #e2ded4;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6f6d65;line-height:1.6">Reporting from the Mat-Su Valley and Alaska. <a href="${NEWS}" style="color:#b81616">news.dot1.media</a></td></tr>
</table></td></tr></table></body></html>`;
  }, [chosen, title, intro, from, to]);
  const text = useMemo(() => `${title}\n${from} to ${to}\n${intro ? "\n" + intro + "\n" : ""}\n` + chosen.map((s) => `${s.final_headline || s.working_headline}\n${s.summary ? s.summary + "\n" : ""}${storyUrl(s)}\n`).join("\n") + `\n${NEWS}`, [chosen, title, intro, from, to]);
  async function copy(kind: "html" | "text") { try { await navigator.clipboard.writeText(kind === "html" ? html : text); setCopied(kind); setTimeout(() => setCopied(""), 1500); } catch {} }
  function download() { const blob = new Blob([html], { type: "text/html" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `dot1-digest-${from}-to-${to}.html`; a.click(); URL.revokeObjectURL(a.href); }
  return (
    <Shell title="Digest builder" subtitle="Turn a week of published stories into an email-ready digest with links to the news site.">
      <div className="stack">
        <div className="card pad">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div><label className="f">From</label><input className="in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="f">To</label><input className="in" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label className="f">Title</label><input className="in" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label className="f">Intro (optional)</label><textarea className="in" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="A line or two from the desk." /></div>
          </div>
        </div>
        <div className="card pad">
          <label className="f">Stories in range <span className="muted">({chosen.length} of {inRange.length} selected)</span></label>
          {inRange.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>No published stories in this range.</div> : inRange.map((s) => (
            <label key={s.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid var(--line)", cursor: "pointer" }}>
              <input type="checkbox" checked={picked.has(s.id)} onChange={() => setPicked((p) => { const n = new Set(p); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })} style={{ marginTop: 3 }} />
              <div><div style={{ fontWeight: 600 }}>{s.final_headline || s.working_headline}</div><div className="muted" style={{ fontSize: 12 }}>{String(s.published_at).slice(0, 10)}{!s.news_story_id && " \u00b7 no news-site link"}</div></div>
            </label>
          ))}
        </div>
        <div className="card pad">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button className="btn primary" onClick={() => copy("html")} disabled={!chosen.length}>{copied === "html" ? "Copied HTML" : "Copy HTML"}</button>
            <button className="btn" onClick={() => copy("text")} disabled={!chosen.length}>{copied === "text" ? "Copied text" : "Copy plain text"}</button>
            <button className="btn" onClick={download} disabled={!chosen.length}>Download .html</button>
            <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Paste the HTML into Mailchimp, Substack, or any email tool.</span>
          </div>
          <label className="f">Preview</label>
          <iframe title="Digest preview" srcDoc={html} style={{ width: "100%", height: 560, border: "1px solid var(--line)", borderRadius: 8, background: "#f4f0e7" }} />
        </div>
      </div>
    </Shell>
  );
}
