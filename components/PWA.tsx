"use client";

import { useEffect, useState } from "react";

// Registers the newsroom service worker (so it installs to the home screen like a native app) and,
// on an iPhone/iPad in Safari where iOS has no install prompt, shows a one-time hint explaining the
// Share -> Add to Home Screen step. Dismissed state is remembered per device.
export default function PWA() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    const inApp = /(FBAN|FBAV|Instagram|Line|Snapchat|Twitter|Pinterest|GSA|musical_ly|Bytedance|WebView|; wv\))/i.test(ua);
    const standalone =
      (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as any).standalone === true;

    if ("serviceWorker" in navigator && (!inApp || standalone)) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    let dismissed = false;
    try { dismissed = localStorage.getItem("d1news-a2hs") === "1"; } catch {}
    if (isIOS && isSafari && !standalone && !inApp && !dismissed) setShowHint(true);
  }, []);

  if (!showHint) return null;

  const close = () => { setShowHint(false); try { localStorage.setItem("d1news-a2hs", "1"); } catch {} };

  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 9999, background: "#141210", color: "#f4f0e7", border: "1px solid #2b2824", borderRadius: 14, padding: "13px 14px", boxShadow: "0 16px 44px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", gap: 12, fontFamily: "Archivo, system-ui, sans-serif", maxWidth: 520, marginInline: "auto" }}>
      <img src="/dot1-news-icon-192.png" alt="" width={38} height={38} style={{ borderRadius: 9, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Install the Newsroom</div>
        <div style={{ fontSize: 12.5, color: "#c7c2b8" }}>
          Tap <span style={{ color: "#f4f0e7" }}>Share</span>, then <span style={{ color: "#f4f0e7" }}>Add to Home Screen</span> to run it like an app.
        </div>
      </div>
      <button onClick={close} aria-label="Dismiss" style={{ background: "transparent", border: "none", color: "#8c877d", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0 }}>×</button>
    </div>
  );
}
