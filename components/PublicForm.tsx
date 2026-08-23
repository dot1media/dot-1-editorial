"use client";

// Shared submission form for both the public tip page and the contact page. Includes the honeypot
// field the public endpoint checks. Styled inline to match the light reader-facing pages.

export function Form({ f, set, submit, err, busy, showSubject }: any) {
  const label: React.CSSProperties = { display: "block", fontFamily: "Archivo, sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "rgba(20,18,16,.7)" };
  const input: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid rgba(20,18,16,.18)", borderRadius: 8, padding: "11px 13px", fontSize: 15, fontFamily: "Archivo, sans-serif", marginBottom: 16, boxSizing: "border-box" };
  return (
    <form onSubmit={submit} style={{ maxWidth: 620 }}>
      {showSubject && (
        <>
          <label style={label}>Subject</label>
          <input style={input} value={f.subject} onChange={(e) => set("subject", e.target.value)} placeholder="In a few words, what is this about?" />
        </>
      )}
      <label style={label}>What is happening? *</label>
      <textarea style={{ ...input, minHeight: 150, lineHeight: 1.5, resize: "vertical" }} value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="Tell us what you know. Include when and where if you can." />
      <label style={label}>Location</label>
      <input style={input} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Wasilla, AK" />

      <label style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "Archivo, sans-serif", fontSize: 14, margin: "4px 0 18px", cursor: "pointer" }}>
        <input type="checkbox" checked={f.anonymous} onChange={(e) => set("anonymous", e.target.checked)} />
        Submit anonymously (we will not store your name or contact)
      </label>

      {!f.anonymous && (
        <>
          <label style={label}>Your name</label>
          <input style={input} value={f.name} onChange={(e) => set("name", e.target.value)} />
          <label style={label}>How to reach you</label>
          <input style={input} value={f.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Email or phone" />
        </>
      )}

      {/* Honeypot: hidden from humans, catches bots. */}
      <input type="text" name="website" value={f.website} onChange={(e) => set("website", e.target.value)} tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} aria-hidden="true" />

      {err && <div style={{ color: "#b81616", fontSize: 14, marginBottom: 14, fontFamily: "Archivo, sans-serif" }}>{err}</div>}

      <button type="submit" disabled={busy} style={{ background: "#b81616", color: "#f4f0e7", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 15, fontWeight: 700, fontFamily: "Archivo, sans-serif", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Sending…" : "Send to the newsroom"}
      </button>
    </form>
  );
}
