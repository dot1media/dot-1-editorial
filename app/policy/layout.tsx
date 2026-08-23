import Link from "next/link";

// Public reader-facing pages live on editorial.dot1.media but read like the news brand, not the
// newsroom tool. Light parchment ground, the suite serif, a simple header and footer. No auth.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fbf8f2", color: "#141210", minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid rgba(20,18,16,.12)", background: "#fbf8f2" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Link href="/policy/standards" style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 800, fontSize: 22, color: "#141210", textDecoration: "none" }}>
            Dot 1 News
          </Link>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.22em", color: "#b81616" }}>
            A DECLARED STANDPOINT
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px" }}>{children}</main>

      <footer style={{ borderTop: "1px solid rgba(20,18,16,.12)", background: "#fbf8f2" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px", display: "flex", flexWrap: "wrap", gap: 18, fontFamily: "Archivo, sans-serif", fontSize: 13 }}>
          <PublicLink href="/policy/standards" label="Editorial Standards" />
          <PublicLink href="/policy/corrections" label="Corrections" />
          <PublicLink href="/policy/ownership" label="Ownership & Funding" />
          <PublicLink href="/policy/advertising" label="Advertising Policy" />
          <PublicLink href="/policy/tip" label="Submit a Tip" />
          <PublicLink href="/policy/contact" label="Contact" />
        </div>
      </footer>
    </div>
  );
}

function PublicLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ color: "#8f1111", textDecoration: "none", fontWeight: 600 }}>
      {label}
    </Link>
  );
}
