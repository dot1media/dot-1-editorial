import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { STANDARDS_PAGES } from "@/lib/newsroom";

// Server-side fetch of a single standards page, seeding the row if missing so the public route
// always resolves. Runs on the editorial database, same content the newsroom edits.
export async function getStandardsPage(slug: string): Promise<{ title: string; body: string; updated_at: string } | null> {
  await ensureSchema();
  const known = STANDARDS_PAGES.find((p) => p.slug === slug);
  if (known) {
    await sql`INSERT INTO standards_pages (slug, title, body) VALUES (${slug}, ${known.title}, '')
      ON CONFLICT (slug) DO NOTHING`;
  }
  const rows = await sql`SELECT title, body, updated_at FROM standards_pages WHERE slug = ${slug} LIMIT 1`;
  return rows.length ? (rows[0] as any) : null;
}

// Render body text as simple paragraphs. Editors write plain prose; blank lines separate
// paragraphs. This keeps the public page readable without a heavy rich-text system for now.
export function Prose({ body }: { body: string }) {
  const paras = String(body || "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (paras.length === 0) {
    return <p style={{ color: "rgba(20,18,16,.5)", fontStyle: "italic" }}>This page is being prepared.</p>;
  }
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} style={{ fontFamily: "Archivo, sans-serif", fontSize: 16, lineHeight: 1.7, marginBottom: 16 }}>
          {p}
        </p>
      ))}
    </>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 38, lineHeight: 1.1, marginBottom: 24 }}>
      {children}
    </h1>
  );
}
