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
  await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS hero_image_credit TEXT DEFAULT ''`;

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

  // Media library: photos and videos uploaded in the portal, with the metadata the news app needs,
  // tracked here so we know what has been published and can update the same news row later.
  await sql`CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'photo',
    url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    title TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    description TEXT DEFAULT '',
    location TEXT DEFAULT '',
    credit TEXT DEFAULT '',
    category TEXT DEFAULT '',
    duration TEXT DEFAULT '',
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    story_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    news_media_id TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_kind ON media(kind, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_story ON media(story_id)`;

  // Media assets: images and video uploaded to Vercel Blob, optionally attached to a story, and
  // publishable into the news photos/videos tables. blob_url is the canonical file; news_id points
  // to the published row in the news database once published (so re-publish updates, not duplicates).
  await sql`CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'image',
    blob_url TEXT NOT NULL,
    thumb_url TEXT DEFAULT '',
    file_name TEXT DEFAULT '',
    mime TEXT DEFAULT '',
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    title TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    description TEXT DEFAULT '',
    credit TEXT DEFAULT '',
    location TEXT DEFAULT '',
    category TEXT DEFAULT '',
    media_style TEXT DEFAULT '',
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'library',
    news_id TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_story ON media_assets(story_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_created ON media_assets(created_at DESC)`;

  // ---- Broadcast production ----------------------------------------------------------------------
  // A show TEMPLATE is the recurring skeleton (e.g. "Evening Edition"): a default set of segment
  // slots in order. An EPISODE is one dated instance of a show, optionally on a weekly schedule.
  // A SEGMENT is one row in an episode's rundown, optionally backed by a story record, with its own
  // estimated duration so the rundown can total the show runtime.

  await sql`CREATE TABLE IF NOT EXISTS show_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    default_weekday INTEGER,           -- 0=Sun..6=Sat, null = ad hoc
    default_time TEXT DEFAULT '',      -- e.g. "18:00", display only
    target_runtime_seconds INTEGER DEFAULT 0,
    segments JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of {type,title,est_seconds}
    weather_location TEXT DEFAULT '',
    weather_lat DOUBLE PRECISION,
    weather_lng DOUBLE PRECISION,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    template_id TEXT REFERENCES show_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    air_date DATE,
    air_time TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planning',  -- planning, ready, live, aired, archived
    weather_location TEXT DEFAULT '',
    weather_lat DOUBLE PRECISION,
    weather_lng DOUBLE PRECISION,
    notes TEXT DEFAULT '',
    aired_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_episodes_date ON episodes(air_date DESC)`;

  await sql`CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'package',  -- open, headlines, package, vo, vosot, interview, weather, sports, breaking, toss, break, outro
    title TEXT NOT NULL DEFAULT '',
    story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
    est_seconds INTEGER NOT NULL DEFAULT 0,
    script TEXT DEFAULT '',             -- teleprompter copy; falls back to story body when linked
    lower_third_name TEXT DEFAULT '',
    lower_third_title TEXT DEFAULT '',
    graphic_json JSONB,                 -- prepared overlay payload handed off to OBS
    presenter_email TEXT,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_segments_episode ON segments(episode_id, position)`;

  // Broadcast bus: a single-row live channel the rundown writes and the OBS overlay output reads.
  // OBS runs the overlay in its own browser that cannot share localStorage with the operator's
  // browser, so a prepared lower-third is handed off through this server row instead of copy-paste.
  // seq increments on every change so the overlay can cheaply detect updates by polling.
  await sql`CREATE TABLE IF NOT EXISTS broadcast_bus (
    id TEXT PRIMARY KEY,
    seq INTEGER NOT NULL DEFAULT 0,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`INSERT INTO broadcast_bus (id, seq, state) VALUES ('current', 0, ${JSON.stringify({ lower: { on: false, kicker: "", name: "", title: "" } })}::jsonb)
    ON CONFLICT (id) DO NOTHING`;

  // Origin + provenance for AI-generated stories. Human stories default to 'human'; the AI desk
  // writes 'ai' with the source item it was generated from, so the newsroom can see where a draft
  // came from and dedupe against feeds.
  await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'human'`;
  await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT ''`;
  await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT ''`;
  await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT ''`;
  await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN NOT NULL DEFAULT false`;

  // Dual-rater scoring, folded into the review workflow. Each story can carry more than one D1-4LS
  // rating: the AI scorer is the first rater on an AI draft, a human is the second, and a third
  // breaks a divergence. The reconciled result is written back to stories.scores. Ratings are kept
  // so the newsroom can see how raters differed.
  await sql`CREATE TABLE IF NOT EXISTS story_ratings (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    rater_kind TEXT NOT NULL DEFAULT 'human',
    rater_id TEXT DEFAULT '',
    rater_name TEXT DEFAULT '',
    scores JSONB NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_story_ratings_story ON story_ratings(story_id, created_at)`;

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
