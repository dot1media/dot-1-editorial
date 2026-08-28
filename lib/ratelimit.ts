import { sql } from "@/lib/db";

let ensured = false;
async function ensure() {
  if (ensured) return;
  await sql`CREATE TABLE IF NOT EXISTS rate_limits (rl_key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, window_start TIMESTAMPTZ NOT NULL DEFAULT now())`;
  ensured = true;
}

// Consumes one hit against `key`. Returns true if within `max` per `windowSec`, false to block.
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  try {
    await ensure();
    const rows = (await sql`
      INSERT INTO rate_limits (rl_key, count, window_start) VALUES (${key}, 1, now())
      ON CONFLICT (rl_key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END
      RETURNING count`) as any[];
    return (Number(rows[0]?.count) || 1) <= max;
  } catch {
    return true;
  }
}
