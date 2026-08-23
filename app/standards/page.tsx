"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { CORE_STANDARDS } from "@/lib/newsroom";

export default function StandardsPage() {
  const { can } = useMe();
  const [pages, setPages] = useState<any[]>([]);
  const [active, setActive] = useState<string>("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);
  const editable = can("standards.edit");

  async function load() {
    const d = await api<{ pages: any[] }>("/api/standards");
    setPages(d.pages || []);
    if (!active && d.pages?.length) { setActive(d.pages[0].slug); setBody(d.pages[0].body || ""); }
  }
  useEffect(() => { load(); }, []);

  function pick(slug: string) {
    const p = pages.find((x) => x.slug === slug);
    setActive(slug);
    setBody(p?.body || "");
    setSaved(false);
  }
  async function save() {
    const p = pages.find((x) => x.slug === active);
    await api(`/api/standards/${active}`, { method: "PUT", body: JSON.stringify({ title: p?.title || active, body }) });
    setSaved(true);
    load();
  }

  return (
    <Shell title="Editorial Standards" subtitle="The public rules that govern D1N journalism."
      actions={<a className="btn ghost sm" href="/policy/standards" target="_blank" rel="noreferrer">View public pages ↗</a>}>
      <div className="grid" style={{ gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          {pages.map((p) => (
            <button key={p.slug} onClick={() => pick(p.slug)} className="nav" style={{ width: "100%", padding: 0 }}>
              <span style={{ display: "block", padding: "11px 14px", fontSize: 13, fontWeight: 600, color: active === p.slug ? "var(--bone)" : "var(--dim)", background: active === p.slug ? "var(--crimson)" : "transparent", borderRadius: 0 }}>{p.title}</span>
            </button>
          ))}
        </div>

        <div className="stack">
          {active === "editorial-standards" && (
            <div className="card pad">
              <div className="mini" style={{ marginBottom: 10 }}>CORE STANDARDS (SHOWN TO READERS)</div>
              <div className="stack" style={{ gap: 6 }}>
                {CORE_STANDARDS.map((s) => (
                  <div key={s} style={{ display: "flex", gap: 8, fontSize: 13 }}><span style={{ color: "var(--gold)" }}>·</span> {s}</div>
                ))}
              </div>
            </div>
          )}
          <div className="card pad">
            <label className="f">{pages.find((p) => p.slug === active)?.title} — page content</label>
            <textarea className="in" value={body} disabled={!editable} onChange={(e) => { setBody(e.target.value); setSaved(false); }} style={{ minHeight: 340 }} placeholder={editable ? "Write the public-facing policy here." : "You do not have edit permission."} />
            {editable && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                <button className="btn primary" onClick={save}>Save page</button>
                {saved && <span className="tiny" style={{ color: "#8fd6a8" }}>Saved.</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
