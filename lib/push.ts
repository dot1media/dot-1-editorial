import { newsSql, newsConfigured } from "@/lib/db";

// Sends push notifications to all opted-in reader devices via Expo's push service.
// Tokens are collected by the news app into reader_push_tokens (news DB). Bad tokens are
// deactivated so the list stays clean. Best-effort: never throws into the caller.

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";

export interface PushResult { sent: number; failed: number; recipients: number; }

export async function sendPushToAll(title: string, body: string, data?: Record<string, any>): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, recipients: 0 };
  if (!newsConfigured()) return result;
  let tokens: string[] = [];
  try {
    const rows = await newsSql`SELECT token FROM reader_push_tokens WHERE enabled = true`;
    tokens = rows.map((r: any) => r.token).filter(Boolean);
  } catch {
    return result; // table not created yet (no one has registered)
  }
  result.recipients = tokens.length;
  if (!tokens.length) return result;

  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const messages = chunk.map((to) => ({ to, title, body, data: data || {}, sound: "default", priority: "high" }));
    try {
      const res = await fetch(EXPO_PUSH, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(messages),
      });
      const j = await res.json().catch(() => null);
      const tickets: any[] = j?.data || [];
      for (let k = 0; k < tickets.length; k++) {
        const t = tickets[k];
        if (t?.status === "ok") result.sent++;
        else {
          result.failed++;
          const err = t?.details?.error;
          if (err === "DeviceNotRegistered") {
            try { await newsSql`UPDATE reader_push_tokens SET enabled = false WHERE token = ${chunk[k]}`; } catch {}
          }
        }
      }
    } catch {
      result.failed += chunk.length;
    }
  }
  return result;
}
