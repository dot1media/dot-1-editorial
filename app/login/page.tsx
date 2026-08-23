"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, useMe } from "@/lib/client";

const PORTAL_URL = "https://portal.dot1.media";

export default function LoginPage() {
  const router = useRouter();
  const { me, loading } = useMe();
  const [showPassword, setShowPassword] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // If the shared suite cookie is already valid, we are signed in via SSO. Go straight in.
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

  async function doSetup(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/api/auth/setup", { method: "POST", body: JSON.stringify({ email, name, password, setupCode }) });
      router.replace("/");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="mono muted tiny">Checking your session…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card pad" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="disp" style={{ fontSize: 28, fontWeight: 700 }}>Dot 1 News</div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.24em", color: "var(--gold)", marginTop: 6 }}>
            EDITORIAL PORTAL
          </div>
        </div>

        {!showPassword && !showSetup ? (
          <>
            <div className="tiny muted" style={{ textAlign: "center", lineHeight: 1.6, marginBottom: 18 }}>
              The editorial portal uses Dot One single sign-on. Sign in once at the main portal and you
              are signed in here automatically. You are not carrying a suite session right now.
            </div>
            <a className="btn primary" href={`${PORTAL_URL}/?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
              style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
              Sign in at the main portal
            </a>
            <button className="btn ghost" onClick={() => router.refresh()} style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}>
              I already signed in — check again
            </button>
            <div style={{ textAlign: "center" }}>
              <button className="btn ghost sm" onClick={() => setShowPassword(true)} style={{ color: "var(--dim)" }}>
                Use a password instead
              </button>
              <span className="muted" style={{ margin: "0 6px" }}>·</span>
              <button className="btn ghost sm" onClick={() => setShowSetup(true)} style={{ color: "var(--dim)" }}>
                First-time setup
              </button>
            </div>
          </>
        ) : showSetup ? (
          <form onSubmit={doSetup}>
            <div className="tiny muted" style={{ lineHeight: 1.6, marginBottom: 16 }}>
              First-time setup. Authorize with the studio master password (the same ADMIN_PASSWORD used
              across the suite) to create your editorial account. The first account becomes Owner.
            </div>
            <label className="f">Email</label>
            <input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dot1.media" autoFocus style={{ marginBottom: 12 }} />
            <label className="f">Name</label>
            <input className="in" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 12 }} />
            <label className="f">New password</label>
            <input className="in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="at least 8 characters" style={{ marginBottom: 12 }} />
            <label className="f">Studio master password</label>
            <input className="in" type="password" value={setupCode} onChange={(e) => setSetupCode(e.target.value)} style={{ marginBottom: 18 }} />
            {err && <div className="tiny" style={{ color: "#ffb4b4", marginBottom: 14 }}>{err}</div>}
            <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}>
              {busy ? "Creating…" : "Create account and sign in"}
            </button>
            <div style={{ textAlign: "center" }}>
              <button type="button" className="btn ghost sm" onClick={() => { setShowSetup(false); setErr(""); }} style={{ color: "var(--dim)" }}>
                Back to single sign-on
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit}>
            <label className="f">Email</label>
            <input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dot1.media" autoFocus style={{ marginBottom: 14 }} />
            <label className="f">Password</label>
            <input className="in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 18 }} />
            {err && <div className="tiny" style={{ color: "#ffb4b4", marginBottom: 14 }}>{err}</div>}
            <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div style={{ textAlign: "center" }}>
              <button type="button" className="btn ghost sm" onClick={() => { setShowPassword(false); setErr(""); }} style={{ color: "var(--dim)" }}>
                Back to single sign-on
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
