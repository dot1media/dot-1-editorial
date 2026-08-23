"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, useMe } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const { me, loading } = useMe();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && me?.signedIn) router.replace("/");
  }, [loading, me, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.replace("/");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card pad" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="disp" style={{ fontSize: 28, fontWeight: 700 }}>Dot 1 News</div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.24em", color: "var(--gold)", marginTop: 6 }}>
            EDITORIAL PORTAL
          </div>
        </div>
        <form onSubmit={submit}>
          <label className="f">Email</label>
          <input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dot1.media" autoFocus style={{ marginBottom: 14 }} />
          <label className="f">Password</label>
          <input className="in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 18 }} />
          {err && <div className="tiny" style={{ color: "#ffb4b4", marginBottom: 14 }}>{err}</div>}
          <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="tiny muted" style={{ textAlign: "center", marginTop: 18, lineHeight: 1.5 }}>
          One sign-in for the whole Dot One suite. If you are already signed in at the main portal, you are signed in here.
        </div>
      </div>
    </div>
  );
}
