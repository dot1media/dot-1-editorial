"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import { api, useMe } from "@/lib/client";
import { Send, Bell } from "lucide-react";

export default function NotifyPage() {
  const { can } = useMe();
  const maySend = can("publish.toNews") || can("broadcast.golive");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);

  async function send() {
    setBusy(true); setMsg("");
    try {
      const r = await api<any>("/api/notify", { method: "POST", body: JSON.stringify({ title, body }) });
      setMsg(`Sent to ${r.recipients} device${r.recipients === 1 ? "" : "s"} (${r.sent} delivered${r.failed ? `, ${r.failed} failed` : ""}).`);
      setTitle(""); setBody(""); setConfirm(false);
    } catch (e: any) { setMsg(e.message || "Could not send."); }
    finally { setBusy(false); }
  }

  return (
    <Shell title="Send Notification" subtitle="Push a breaking-news alert to everyone with the app.">
      {!maySend && <div className="card pad muted tiny" style={{ marginBottom: 16 }}>Sending notifications needs publish or broadcast permissions.</div>}

      <div className="card pad" style={{ maxWidth: 560, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted,#8f887c)" }}>
          <Bell size={16} /> <span className="tiny">Goes to every reader who allowed notifications.</span>
        </div>
        <div>
          <label className="f">Title</label>
          <input className="in" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Breaking: …" disabled={!maySend} />
        </div>
        <div>
          <label className="f">Message</label>
          <textarea className="in" value={body} maxLength={300} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 80 }} placeholder="One or two lines readers will see." disabled={!maySend} />
        </div>

        {/* Live phone-style preview */}
        <div>
          <label className="f">Preview</label>
          <div style={{ background: "#1c1a17", borderRadius: 14, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "#b81616", flex: "0 0 auto" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{title || "Dot 1 News"}</div>
              <div style={{ color: "#cfc8ba", fontSize: 12, marginTop: 2 }}>{body || "Your message appears here."}</div>
            </div>
          </div>
        </div>

        {msg && <div className="tiny" style={{ color: msg.startsWith("Sent") ? "#8fd6a8" : "#ffb4b4" }}>{msg}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {!confirm ? (
            <button className="btn primary" disabled={!maySend || !title.trim() || busy} onClick={() => setConfirm(true)}><Send size={15} /> Send to everyone…</button>
          ) : (
            <>
              <button className="btn ghost" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn primary" disabled={busy} onClick={send}>{busy ? "Sending…" : "Confirm send"}</button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
