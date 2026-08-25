import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/schema";
import { readJson } from "@/lib/api";
import { sendPushToAll } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manual breaking-news / announcement push. Sent to all opted-in reader devices.
export async function POST(request: Request) {
  const gate = await requireCapability("broadcast.view");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  if (!can(account.permissions, "publish.toNews") && !can(account.permissions, "broadcast.golive"))
    return NextResponse.json({ error: "You don't have permission to send notifications." }, { status: 403 });

  const b = await readJson(request);
  const title = (b.title || "").toString().trim().slice(0, 120);
  const body = (b.body || "").toString().trim().slice(0, 300);
  if (!title) return NextResponse.json({ error: "Give the notification a title." }, { status: 400 });

  const data: Record<string, any> = { type: "announcement" };
  if (b.storyId) { data.type = "story"; data.id = String(b.storyId).slice(0, 64); }

  const res = await sendPushToAll(title, body, data);
  await audit(account.email, "notify.send", "push", "all", { title, ...res });
  return NextResponse.json({ ok: true, ...res });
}
