import { sql } from "@/lib/db";
import type { NewsCategory } from "@/lib/ai/sources";

/**
 * Topic preferences for the AI desk.
 *
 * The desk used to pick the most widely-covered events first, which skewed the
 * edition toward politics (the beat with the broadest wire coverage). These
 * preferences let an editor decide which topics the desk reaches for and how
 * much weight each gets, so a run is balanced across topics instead of flooded
 * with one. Stored in the editorial database; read by runGeneration.
 */

export const DESK_CATEGORIES: NewsCategory[] = [
  "world", "politics", "faith", "culture", "technology", "health", "business", "environment",
];

export interface TopicPref {
  category: NewsCategory;
  enabled: boolean;
  /** Relative pull per selection cycle; 0 means do not reach for this topic. */
  weight: number;
}

let ensured = false;
export async function ensureDeskTopics(): Promise<void> {
  if (ensured) return;
  await sql`CREATE TABLE IF NOT EXISTS desk_topics (
    category TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    weight INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`;
  for (const c of DESK_CATEGORIES) {
    await sql`INSERT INTO desk_topics (category, enabled, weight) VALUES (${c}, true, 1)
              ON CONFLICT (category) DO NOTHING`;
  }
  ensured = true;
}

export async function getTopicPrefs(): Promise<TopicPref[]> {
  await ensureDeskTopics();
  const rows = (await sql`SELECT category, enabled, weight FROM desk_topics`) as any[];
  const byCat = new Map(rows.map((r) => [String(r.category), r]));
  return DESK_CATEGORIES.map((c) => {
    const r: any = byCat.get(c);
    return {
      category: c,
      enabled: r ? !!r.enabled : true,
      weight: r ? Math.max(0, Number(r.weight) || 0) : 1,
    };
  });
}

export async function setTopicPrefs(
  prefs: { category: string; enabled: boolean; weight: number }[],
): Promise<void> {
  await ensureDeskTopics();
  for (const p of prefs) {
    if (!DESK_CATEGORIES.includes(p.category as NewsCategory)) continue;
    const weight = Math.max(0, Math.min(5, Math.round(Number(p.weight) || 0)));
    await sql`UPDATE desk_topics SET enabled = ${!!p.enabled}, weight = ${weight}, updated_at = NOW()
              WHERE category = ${p.category}`;
  }
}
