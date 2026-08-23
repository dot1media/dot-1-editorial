"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";

export default function TipsPage() {
  const { can } = useMe();
  const router = useRouter();
  const [tips, setTips] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const d = await api<{ tips: any[] }>("/api/tips");
    setTips(d.tips || []);
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    await api("/api/tips", { method: "PATCH", body: JSON.stringify({ id, status }) });
    load();
  }
  async function promote(id: string) {
    const r = await api<{ storyId: string }>("/api/tips", { method: "PATCH", body: JSON.stringify({ id, promote: true }) });
    router.push(`/stories/${r.storyId}`);
  }

  return (
    <Shell title="Tips" subtitle="Public submissions and newsroom contact.">
      {!loaded ? <span className="mono muted tiny">Loading…</span> : tips.length === 0 ? (
        <div className="card pad muted tiny">No tips yet. The public submit form feeds this queue.</div>
      ) : (
        <div className="stack">
          {tips.map((t) => (
            <div key={t.id} className="card pad">
              <div className="row-between">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={"chip" + (t.kind === "tip" ? " gold" : "")}>{t.kind}</span>
                  <span className={"chip" + (t.status === "new" ? " crimson" : t.status === "promoted" ? " ok" : "")}>{t.status}</span>
                  {t.anonymous && <span className="chip">anonymous</span>}
                </div>
                <span className="tiny muted">{new Date(t.created_at).toLocaleString()}</span>
              </div>
              {t.subject && <div style={{ fontWeight: 700, marginTop: 10 }}>{t.subject}</div>}
              <div style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>{t.body}</div>
              <div className="tiny muted" style={{ marginTop: 8 }}>
                {t.location && <>Location: {t.location} · </>}
                {!t.anonymous && (t.name || t.contact) && <>From: {t.name} {t.contact && `(${t.contact})`}</>}
              </div>
              {t.status !== "promoted" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {can("story.create") && <button className="btn gold sm" onClick={() => promote(t.id)}>Promote to story</button>}
                  <button className="btn ghost sm" onClick={() => setStatus(t.id, "reviewed")}>Mark reviewed</button>
                  <button className="btn ghost sm" onClick={() => setStatus(t.id, "dismissed")}>Dismiss</button>
                </div>
              )}
              {t.linked_story_id && <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => router.push(`/stories/${t.linked_story_id}`)}>Open linked story →</button>}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
