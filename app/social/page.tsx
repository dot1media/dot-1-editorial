"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";

type Post = {
  id: string;
  news_story_id: string;
  headline: string;
  category: string;
  verification_status: string;
  image_url: string;
  caption_instagram: string;
  caption_facebook: string;
  targets: string[] | string;
  status: string;
  scheduled_at: string | null;
  posted_at: string | null;
  ig_post_id: string;
  fb_post_id: string;
  error: string;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#8A8175",
  approved: "#C8A24A",
  scheduled: "#4E9BD4",
  posted: "#4CAF7D",
  failed: "#E0544B",
};

function targetsOf(p: Post): string[] {
  return Array.isArray(p.targets) ? p.targets : JSON.parse((p.targets as string) || "[]");
}

export default function SocialPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [metaOk, setMetaOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ posts: Post[]; metaConfigured: boolean }>("/api/social");
      setPosts(d.posts);
      setMetaOk(d.metaConfigured);
    } catch (e: any) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy("generate"); setNote("");
    try {
      const d = await api<{ created: any[]; skipped: any[] }>("/api/social/generate", { method: "POST", body: JSON.stringify({ limit: 10 }) });
      setNote(`Added ${d.created.length} new draft${d.created.length === 1 ? "" : "s"}. ${d.skipped.length} already queued or had no photo.`);
      await load();
    } catch (e: any) { setNote(e.message); } finally { setBusy(""); }
  }

  async function patch(id: string, body: any) {
    const d = await api<{ post: Post }>(`/api/social/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setPosts((ps) => ps.map((p) => (p.id === id ? d.post : p)));
  }

  async function approve(id: string) { setBusy(id); try { await patch(id, { status: "approved" }); } finally { setBusy(""); } }
  async function unapprove(id: string) { setBusy(id); try { await patch(id, { status: "draft", scheduled_at: null }); } finally { setBusy(""); } }

  async function schedule(id: string, local: string) {
    if (!local) return;
    setBusy(id);
    try { await patch(id, { scheduled_at: new Date(local).toISOString(), status: "scheduled" }); } finally { setBusy(""); }
  }

  async function postNow(id: string) {
    if (!confirm("Post this to the selected accounts now?")) return;
    setBusy(id); setNote("");
    try {
      const r = await api<{ ok: boolean; error?: string }>(`/api/social/${id}/post`, { method: "POST" });
      setNote(r.ok ? "Posted." : `Posted with issues: ${r.error}`);
      await load();
    } catch (e: any) { setNote(e.message); await load(); } finally { setBusy(""); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this post from the queue?")) return;
    setBusy(id);
    try { await api(`/api/social/${id}`, { method: "DELETE" }); setPosts((ps) => ps.filter((p) => p.id !== id)); } finally { setBusy(""); }
  }

  function toggleTarget(p: Post, t: string) {
    const cur = targetsOf(p);
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    patch(p.id, { targets: next });
  }

  return (
    <Shell title="Social · Make Dot 1 Seen" subtitle="Branded posts from published stories, reviewed before they reach Instagram and Facebook">
      <div className="row-between" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div className="tiny" style={{ color: metaOk ? "#4CAF7D" : "#E0544B" }}>
          {metaOk ? "Meta connected" : "Meta not configured (add META_PAGE_TOKEN in Vercel)"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost sm" onClick={load}>Refresh</button>
          <button className="btn primary sm" onClick={generate} disabled={busy === "generate"}>
            {busy === "generate" ? "Generating…" : "Generate from latest"}
          </button>
        </div>
      </div>

      {err && <div className="card pad" style={{ color: "#ffb4b4", marginBottom: 12 }}>{err}</div>}
      {note && <div className="card pad tiny" style={{ marginBottom: 12 }}>{note}</div>}

      {posts.length === 0 && (
        <div className="card pad">
          <div className="tiny muted" style={{ lineHeight: 1.6 }}>
            No posts queued yet. Click <strong>Generate from latest</strong> to build draft cards from the most recent published stories, then review and approve them here.
          </div>
        </div>
      )}

      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {posts.map((p) => {
          const tg = targetsOf(p);
          return (
            <div key={p.id} className="card pad" style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {/* preview */}
              <div style={{ width: 240, flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/social/card/${p.id}?format=ig_portrait`} alt="" style={{ width: 240, height: 300, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 9, background: STATUS_COLOR[p.status] || "#888" }} />
                  <span className="tiny" style={{ textTransform: "uppercase", letterSpacing: 1, color: STATUS_COLOR[p.status] || "#888", fontWeight: 700 }}>{p.status}</span>
                </div>
              </div>

              {/* controls */}
              <div style={{ flex: 1, minWidth: 320 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{p.headline}</div>
                <div className="tiny muted" style={{ marginBottom: 10 }}>{p.category} · {p.verification_status}</div>

                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {["instagram", "facebook"].map((t) => (
                    <button key={t} className={"btn sm " + (tg.includes(t) ? "primary" : "ghost")} onClick={() => toggleTarget(p, t)}>
                      {t === "instagram" ? "Instagram" : "Facebook"}
                    </button>
                  ))}
                </div>

                <label className="mini">INSTAGRAM CAPTION</label>
                <textarea className="in" defaultValue={p.caption_instagram} style={{ width: "100%", minHeight: 96, marginBottom: 10, fontSize: 13 }}
                  onBlur={(e) => e.target.value !== p.caption_instagram && patch(p.id, { caption_instagram: e.target.value })} />

                <label className="mini">FACEBOOK CAPTION</label>
                <textarea className="in" defaultValue={p.caption_facebook} style={{ width: "100%", minHeight: 96, marginBottom: 10, fontSize: 13 }}
                  onBlur={(e) => e.target.value !== p.caption_facebook && patch(p.id, { caption_facebook: e.target.value })} />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {p.status === "draft" && <button className="btn gold sm" onClick={() => approve(p.id)} disabled={busy === p.id}>Approve</button>}
                  {(p.status === "approved" || p.status === "scheduled") && <button className="btn ghost sm" onClick={() => unapprove(p.id)} disabled={busy === p.id}>Unapprove</button>}
                  <input type="datetime-local" className="in" style={{ padding: "6px 8px", fontSize: 12.5, width: 210 }}
                    defaultValue={p.scheduled_at ? new Date(p.scheduled_at).toISOString().slice(0, 16) : ""}
                    onChange={(e) => schedule(p.id, e.target.value)} />
                  <button className="btn primary sm" onClick={() => postNow(p.id)} disabled={busy === p.id || !metaOk || tg.length === 0}>
                    {busy === p.id ? "Working…" : "Post now"}
                  </button>
                  <button className="btn ghost sm" onClick={() => remove(p.id)} disabled={busy === p.id} style={{ marginLeft: "auto", color: "#E0544B" }}>Delete</button>
                </div>

                {(p.ig_post_id || p.fb_post_id) && (
                  <div className="tiny muted" style={{ marginTop: 8 }}>
                    {p.ig_post_id ? `IG posted (${p.ig_post_id}) ` : ""}{p.fb_post_id ? `FB posted (${p.fb_post_id})` : ""}
                  </div>
                )}
                {p.error && <div className="tiny" style={{ marginTop: 8, color: "#E0544B" }}>{p.error}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
