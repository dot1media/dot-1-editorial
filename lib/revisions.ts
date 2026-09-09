import { sql } from "@/lib/db";
let ensured = false;
export async function ensureRevisions() { if (ensured) return; await sql`CREATE TABLE IF NOT EXISTS story_revisions (id TEXT PRIMARY KEY, story_id TEXT NOT NULL, working_headline TEXT, final_headline TEXT, summary TEXT, body TEXT, saved_by TEXT DEFAULT '', reason TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now())`; await sql`CREATE INDEX IF NOT EXISTS story_revisions_sid ON story_revisions (story_id, created_at DESC)`; ensured = true; }
// Snapshot the story's current text before it changes. Skips if nothing textual is changing. Keeps the newest 60.
export async function snapshotIfChanging(storyId: string, incoming: Record<string, any>, savedBy: string, reason = "edit") {
  const keys = ["workingHeadline", "finalHeadline", "summary", "body"] as const;
  if (!keys.some((k) => k in incoming)) return;
  await ensureRevisions();
  const cur = ((await sql`SELECT working_headline, final_headline, summary, body FROM stories WHERE id = ${storyId} LIMIT 1`) as any[])[0];
  if (!cur) return;
  const map: Record<string, string> = { workingHeadline: "working_headline", finalHeadline: "final_headline", summary: "summary", body: "body" };
  const changed = keys.some((k) => k in incoming && String(incoming[k] ?? "") !== String(cur[map[k]] ?? ""));
  if (!changed) return;
  await sql`INSERT INTO story_revisions (id, story_id, working_headline, final_headline, summary, body, saved_by, reason) VALUES (${"rv_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)}, ${storyId}, ${cur.working_headline || ""}, ${cur.final_headline || ""}, ${cur.summary || ""}, ${cur.body || ""}, ${savedBy}, ${reason})`;
  await sql`DELETE FROM story_revisions WHERE story_id = ${storyId} AND id NOT IN (SELECT id FROM story_revisions WHERE story_id = ${storyId} ORDER BY created_at DESC LIMIT 60)`;
}
