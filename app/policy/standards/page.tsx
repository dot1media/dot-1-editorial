import { getStandardsPage, Prose, PageTitle } from "@/components/public";
import { CORE_STANDARDS, CLASSIFICATIONS } from "@/lib/newsroom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StandardsPublicPage() {
  const page = await getStandardsPage("editorial-standards");
  return (
    <div>
      <PageTitle>{page?.title || "Editorial Standards"}</PageTitle>

      <p style={{ fontFamily: "Archivo, sans-serif", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
        These are the standards that govern Dot 1 News journalism. We do not claim a view from
        nowhere. We tell you where we stand, and we hold our reporting to the disciplines below.
      </p>

      <div style={{ background: "#fff", border: "1px solid rgba(20,18,16,.1)", borderRadius: 12, padding: "24px 28px", marginBottom: 32 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#b81616", marginBottom: 16 }}>
          OUR CORE STANDARDS
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {CORE_STANDARDS.map((s) => (
            <li key={s} style={{ display: "flex", gap: 10, fontFamily: "Archivo, sans-serif", fontSize: 15, lineHeight: 1.5 }}>
              <span style={{ color: "#c8a24a", fontWeight: 700 }}>·</span> {s}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#b81616", marginBottom: 14 }}>
          HOW WE LABEL OUR WORK
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {CLASSIFICATIONS.map((c) => (
            <div key={c.id} style={{ borderLeft: "3px solid #c8a24a", paddingLeft: 14 }}>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 17 }}>{c.label}</div>
              <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 14.5, lineHeight: 1.5, color: "rgba(20,18,16,.75)" }}>{c.blurb}</div>
            </div>
          ))}
        </div>
      </div>

      <Prose body={page?.body || ""} />
    </div>
  );
}
