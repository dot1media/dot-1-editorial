import { getStandardsPage, Prose, PageTitle } from "@/components/public";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The corrections page carries the policy text AND the actual public record of corrections and
// updates on published stories, newest first. This is the transparency the standards promise:
// nothing silently erased.
async function recentCorrections() {
  await ensureSchema();
  const rows = await sql`
    SELECT c.kind, c.what_changed, c.why_changed, c.created_at, s.final_headline, s.working_headline
    FROM corrections c JOIN stories s ON s.id = c.story_id
    WHERE s.news_story_id IS NOT NULL
    ORDER BY c.created_at DESC LIMIT 50`;
  return rows as any[];
}

export default async function CorrectionsPublicPage() {
  const [page, list] = await Promise.all([getStandardsPage("corrections"), recentCorrections()]);
  return (
    <div>
      <PageTitle>{page?.title || "Corrections & Clarifications"}</PageTitle>
      <Prose body={page?.body || ""} />

      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#b81616", margin: "32px 0 16px" }}>
        THE RECORD
      </div>

      {list.length === 0 ? (
        <p style={{ fontFamily: "Archivo, sans-serif", fontSize: 15, color: "rgba(20,18,16,.55)" }}>
          No corrections or updates have been issued yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {list.map((c, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid rgba(20,18,16,.1)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: c.kind === "correction" ? "#b81616" : "#8f6f1f", textTransform: "uppercase" }}>
                  {c.kind}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "rgba(20,18,16,.5)" }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 16, marginTop: 6 }}>
                {c.final_headline || c.working_headline}
              </div>
              <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 14.5, lineHeight: 1.55, marginTop: 6 }}>{c.what_changed}</div>
              {c.why_changed && (
                <div style={{ fontFamily: "Archivo, sans-serif", fontSize: 13.5, lineHeight: 1.5, marginTop: 4, color: "rgba(20,18,16,.65)" }}>
                  {c.why_changed}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
