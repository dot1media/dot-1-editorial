import { sql } from "@/lib/db";

// One idempotent migration for the editorial database. Every statement is IF NOT EXISTS or
// additive, so it is safe to run on every cold start (guarded by the `ensured` latch) and safe
// to re-run by hand. The editorial DB is independent of the news DB; nothing here touches news.

let ensured = false;

export async function ensureSchema(): Promise<void> {
  if (ensured) return;

  // Suite admin accounts. Mirrors the portal's admin_accounts shape (email, name, password_hash)
  // and extends it with role + permission overrides for the newsroom. The portal and editorial
  // share the signed cookie; each app may keep its own account row, but email is the identity.
  await sql`CREATE TABLE IF NOT EXISTS admin_accounts (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ
  )`;

  // Story records: the spine of the newsroom workflow.
  await sql`CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    slug TEXT,
    working_headline TEXT NOT NULL,
    final_headline TEXT,
    summary TEXT DEFAULT '',
    body TEXT DEFAULT '',
    classification TEXT NOT NULL DEFAULT 'news',
    category TEXT DEFAULT 'world',
    location TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'routine',
    status TEXT NOT NULL DEFAULT 'tip',
    flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    hero_image TEXT DEFAULT '',
    why_publish TEXT DEFAULT '',
    reporter_email TEXT,
    editor_email TEXT,
    producer_email TEXT,
    photographer_email TEXT,
    anchor_email TEXT,
    director_email TEXT,
    review_state TEXT NOT NULL DEFAULT 'not_verified',
    scores JSONB,
    score_confidence TEXT,
    news_story_id TEXT,
    planned_publish_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_stories_updated ON stories(updated_at DESC)`;

  // Sources attached to a story.
  await sql`CREATE TABLE IF NOT EXISTS story_sources (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    name TEXT DEFAULT '',
    organization TEXT DEFAULT '',
    title TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    source_type TEXT DEFAULT 'interview',
    attribution TEXT DEFAULT 'on_record',
    date_contacted TIMESTAMPTZ,
    response_status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    reliability_notes TEXT DEFAULT '',
    added_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sources_story ON story_sources(story_id)`;

  // Evidence / documents attached to a story.
  await sql`CREATE TABLE IF NOT EXISTS story_evidence (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    kind TEXT DEFAULT 'document',
    label TEXT DEFAULT '',
    url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    added_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_evidence_story ON story_evidence(story_id)`;

  // Chronological reporting log. Timestamp + author captured automatically.
  await sql`CREATE TABLE IF NOT EXISTS reporting_log (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    entry TEXT NOT NULL,
    author_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_log_story ON reporting_log(story_id, created_at)`;

  // Individually tracked verification claims.
  await sql`CREATE TABLE IF NOT EXISTS verification_claims (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    claim TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unconfirmed',
    sources TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_claims_story ON verification_claims(story_id)`;

  // Editorial review checklist: one row per story, one boolean per required item, plus who/when.
  await sql`CREATE TABLE IF NOT EXISTS review_checklists (
    story_id TEXT PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;

  // Corrections ledger. Never destructive: every correction is a permanent row.
  await sql`CREATE TABLE IF NOT EXISTS corrections (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'correction',
    what_changed TEXT NOT NULL,
    why_changed TEXT DEFAULT '',
    authorized_by TEXT,
    original_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_corrections_story ON corrections(story_id)`;

  // Public tips and newsroom contact submissions from the public pages.
  await sql`CREATE TABLE IF NOT EXISTS tips (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'tip',
    name TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    location TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    body TEXT NOT NULL,
    anonymous BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'new',
    linked_story_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status, created_at DESC)`;

  // Editable public standards pages (Editorial Standards, Ownership & Funding, etc.).
  await sql`CREATE TABLE IF NOT EXISTS standards_pages (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;

  // Append-only audit trail. Every consequential action lands here for accountability.
  await sql`CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    detail JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC)`;

  ensured = true;
}

// Append-only audit write. Never throws into the request path; auditing must not break actions.
export async function audit(
  actorEmail: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: unknown
): Promise<void> {
  try {
    await sql`INSERT INTO audit_log (actor_email, action, target_type, target_id, detail)
      VALUES (${actorEmail}, ${action}, ${targetType || null}, ${targetId || null}, ${
      detail ? JSON.stringify(detail) : null
    })`;
  } catch {
    // swallow: audit failures must not abort the underlying operation
  }
}
