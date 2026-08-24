import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { audit } from "@/lib/schema";
import { readJson } from "@/lib/api";
import { getArticle, updateArticle, deleteArticle, deletePhoto, deleteVideo } from "@/lib/newsArchive";

export const runtime = "nodejs";

// GET a single published article (for editing).
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const gate = await requireCapability("story.view");
  if ("response" in gate) return gate.response;
  const { kind, id } = await params;
  if (kind !== "article") return NextResponse.json({ error: "Only articles are editable." }, { status: 400 });
  const article = await getArticle(id);
  if (!article) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ article });
}

// PATCH edits a published article in place (goes live immediately).
export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const gate = await requireCapability("story.edit");
  if ("response" in gate) return gate.response;
  const { account } = gate;
  const { kind, id } = await params;
  if (kind !== "article") return NextResponse.json({ error: "Only articles are editable." }, { status: 400 });

  const current = await getArticle(id);
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const b = await readJson(request);
  const merged = {
    title: (b.title ?? current.title) || "",
    summary: (b.summary ?? current.summary) || "",
    content: (b.content ?? current.content) || "",
    category: (b.category ?? current.category) || "",
    image: (b.image ?? current.image) || "",
    author: (b.author ?? current.author) || "",
  };
  await updateArticle(id, merged);
  await audit(account.email, "published.edit", "news_story", id, { fields: Object.keys(b) });
  return NextResponse.json({ ok: true });
}

// DELETE removes posted content from the live site. Articles need story.delete; media needs media.publish.
export async function DELETE(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const cap = kind === "article" ? "story.delete" : "media.publish";
  const gate = await requireCapability(cap as any);
  if ("response" in gate) return gate.response;
  const { account } = gate;

  if (kind === "article") await deleteArticle(id);
  else if (kind === "photo") await deletePhoto(id);
  else if (kind === "video") await deleteVideo(id);
  else return NextResponse.json({ error: "Unknown kind." }, { status: 400 });

  await audit(account.email, "published.delete", `news_${kind}`, id, {});
  return NextResponse.json({ ok: true });
}
