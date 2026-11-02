/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { META } from "@/lib/social/meta";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public route: renders the branded Dot 1 News post card for a queued social
// post as a JPEG (Instagram requires JPEG). Three alternating styles keep the
// grid varied: A (photo over a text panel), B (full-bleed photo, headline
// overlaid), C (text-forward, photo band at the foot). The Graph API fetches a
// Blob snapshot of this at publish time.

const INK = "#141210";
const CRIMSON = "#B81616";
const BONE = "#F4F0E7";
const GOLD = "#C8A24A";
const MUTED = "#9A9186";
const HAIR = "#2A2520";

const VCOL: Record<string, string> = { verified: GOLD, pending: "#E08A2B", unverified: "#C8372A" };
const VLABEL: Record<string, string> = { verified: "Verified", pending: "Pending verification", unverified: "Unverified" };

async function asset(origin: string, name: string): Promise<ArrayBuffer> {
  const res = await fetch(new URL(`/social-assets/${name}`, origin));
  if (!res.ok) throw new Error(`asset ${name}: ${res.status}`);
  return res.arrayBuffer();
}

// Prepare the article photo at the exact pixel size of the region it fills (at
// 2x render scale), cover-cropped with a high-quality kernel and lightly
// sharpened, then handed to satori as a data URI. This takes resampling out of
// satori's hands so the photo is as crisp as the source allows, and is encoded
// at full target density rather than being naively stretched. Best effort: any
// failure falls back to the original URL so a card still renders.
// Many feeds hand us a resized thumbnail rather than the full-size original.
// Strip the common resize markers so the origin serves the full image; if that
// variant does not exist (or is signature-protected), we fall back to the URL
// as given. Only resize params are touched, so a signed URL simply 404s and we
// retry the original.
function fullSizeCandidate(src: string): string {
  try {
    const u = new URL(src);
    // WordPress and similar: name-1024x576.jpg -> name.jpg
    u.pathname = u.pathname.replace(/-\d{2,4}x\d{2,4}(\.[a-z0-9]+)$/i, "$1");
    for (const k of ["w", "h", "width", "height", "resize", "fit", "crop", "dpr", "max-w", "max-h"]) {
      u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return src;
  }
}

async function preparePhoto(src: string, targetW: number, targetH: number): Promise<string> {
  if (!src) return src;
  const candidates = Array.from(new Set([fullSizeCandidate(src), src]));
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate);
      if (!res.ok) continue;
      const input = Buffer.from(await res.arrayBuffer());
      const out = await sharp(input)
        .rotate()
        .resize(targetW, targetH, { fit: "cover", position: "attention", kernel: "lanczos3", withoutEnlargement: false })
        .sharpen({ sigma: 0.6 })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
      return `data:image/jpeg;base64,${out.toString("base64")}`;
    } catch {
      /* try the next candidate */
    }
  }
  return src;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const origin = url.origin;

  await ensureSchema();
  const rows = (await sql`SELECT * FROM social_posts WHERE id = ${id} LIMIT 1`) as any[];
  if (!rows.length) return new Response("Not found", { status: 404 });
  const post = rows[0];

  const W = 1080, H = 1350;
  // Render at 2x so vector text, logos and rules stay razor-sharp and the card
  // survives the platforms' own re-compression. The design below stays in the
  // 1080x1350 coordinate space; a scale wrapper maps it to the real output.
  const S = 2;
  const style = (url.searchParams.get("style") || post.style || "a").toLowerCase();
  const vstatus = (post.verification_status || "verified") as string;
  const vcol = VCOL[vstatus] || GOLD;
  const vlabel = VLABEL[vstatus] || "Verified";
  const category = String(post.category || "News").toUpperCase();
  const headline = String(post.headline || "");
  const summary = String(post.summary || "");
  const rawPhoto = String(post.image_url || "");
  // Size the photo to the region each style gives it (at 2x), so it is encoded
  // at exactly the density it will be shown at.
  const [photoW, photoH] = style === "b" ? [W * S, H * S]
    : style === "c" ? [W * S, 430 * S]
    : [W * S, 560 * S];
  const photo = await preparePhoto(rawPhoto, photoW, photoH);
  const globeRed = new URL("/social-assets/globe-red.png", origin).toString();
  const globeBone = new URL("/social-assets/globe-bone.png", origin).toString();

  const [bodoni, archivo, archivo6, plex] = await Promise.all([
    asset(origin, "Bodoni-700.ttf"),
    asset(origin, "Archivo-400.ttf"),
    asset(origin, "Archivo-600.ttf"),
    asset(origin, "Plex-600.ttf"),
  ]);

  const globeH = 52, globeW = Math.round((globeH * 449) / 1024);
  const pad = 64;

  const Masthead = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, paddingBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: 44, letterSpacing: 6 }}>DOT</span>
        <img src={globeRed} width={globeW} height={globeH} style={{ marginLeft: 10, marginRight: 10 }} alt="" />
        <span style={{ fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: 44, letterSpacing: 6 }}>NEWS</span>
      </div>
      <span style={{ fontFamily: "Plex", fontWeight: 600, color: GOLD, fontSize: 14, letterSpacing: 5, marginTop: 10 }}>A DECLARED STANDPOINT</span>
    </div>
  );

  const Footer = (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: pad, paddingRight: pad, paddingTop: 22, paddingBottom: 22, borderTop: `1px solid ${HAIR}`, backgroundColor: INK }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img src={globeBone} width={Math.round((30 * 449) / 1024)} height={30} alt="" />
        <span style={{ fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: 22, letterSpacing: 3, marginLeft: 10 }}>DOT 1 NEWS</span>
      </div>
      <span style={{ fontFamily: "Plex", fontWeight: 600, color: MUTED, fontSize: 15, letterSpacing: 1.5 }}>@{META.handle} · news.dot1.media</span>
    </div>
  );

  const Kicker = (
    <div style={{ display: "flex", backgroundColor: CRIMSON, color: BONE, fontFamily: "Plex", fontWeight: 600, fontSize: 16, letterSpacing: 3, padding: "7px 14px" }}>{category}</div>
  );

  const VLine = (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: vcol }} />
      <span style={{ fontFamily: "Archivo", fontWeight: 600, color: MUTED, fontSize: 18, marginLeft: 10 }}>{vlabel} · Dot 1 Newsroom</span>
    </div>
  );

  let tree: ReactElement;

  if (style === "b") {
    // Full-bleed photo, headline overlaid on a bottom scrim.
    tree = (
      <div style={{ width: W, height: H, display: "flex", position: "relative", backgroundColor: INK, fontFamily: "Archivo" }}>
        <img src={photo} width={W} height={H} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} alt="" />
        <div style={{ position: "absolute", top: 0, left: 0, width: W, height: 260, display: "flex", backgroundImage: "linear-gradient(to bottom, rgba(20,18,16,0.82), rgba(20,18,16,0))" }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, width: W, height: 880, display: "flex", backgroundImage: "linear-gradient(to top, rgba(20,18,16,0.97) 32%, rgba(20,18,16,0.6) 62%, rgba(20,18,16,0))" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center" }}>{Masthead}</div>
        <div style={{ position: "absolute", left: pad, right: pad, bottom: 118, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", marginBottom: 16 }}>{Kicker}</div>
          <div style={{ display: "flex", fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: 66, lineHeight: 1.06 }}>{headline}</div>
          <div style={{ display: "flex", marginTop: 22 }}>{VLine}</div>
        </div>
        {Footer}
      </div>
    );
  } else if (style === "c") {
    // Text-forward: headline leads, a photo band sits at the foot.
    tree = (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", position: "relative", backgroundColor: INK, fontFamily: "Archivo" }}>
        {Masthead}
        <div style={{ display: "flex", height: 2, backgroundColor: CRIMSON, marginLeft: pad, marginRight: pad }} />
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, paddingLeft: pad, paddingRight: pad, paddingTop: 40 }}>
          <div style={{ display: "flex", marginBottom: 20 }}>{Kicker}</div>
          <div style={{ display: "flex", fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: 70, lineHeight: 1.05 }}>{headline}</div>
          {summary ? (
            <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 400, color: MUTED, fontSize: 25, lineHeight: 1.45, marginTop: 24 }}>{summary}</div>
          ) : null}
          <div style={{ display: "flex", marginTop: 24 }}>{VLine}</div>
        </div>
        <div style={{ display: "flex", position: "relative", width: W, height: 430, marginBottom: 86 }}>
          <img src={photo} width={W} height={430} style={{ objectFit: "cover" }} alt="" />
        </div>
        {Footer}
      </div>
    );
  } else {
    // Style A: photo over a text panel (the original).
    tree = (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", backgroundColor: INK, fontFamily: "Archivo", position: "relative" }}>
        {Masthead}
        <div style={{ display: "flex", height: 2, backgroundColor: CRIMSON, marginLeft: pad, marginRight: pad }} />
        <div style={{ display: "flex", position: "relative", width: W, height: 560, marginTop: 18 }}>
          <img src={photo} width={W} height={560} style={{ objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", left: pad, bottom: 18, display: "flex" }}>{Kicker}</div>
          <div style={{ position: "absolute", right: pad, top: 18, width: 26, height: 26, borderRadius: 999, backgroundColor: vcol }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, paddingLeft: pad, paddingRight: pad, paddingTop: 30, paddingBottom: 104 }}>
          <div style={{ display: "flex", fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: 62, lineHeight: 1.08 }}>{headline}</div>
          {summary ? (
            <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 400, color: MUTED, fontSize: 24, lineHeight: 1.45, marginTop: 18 }}>{summary}</div>
          ) : null}
          <div style={{ display: "flex", marginTop: 20 }}>{VLine}</div>
        </div>
        {Footer}
      </div>
    );
  }

  // Map the 1080x1350 design onto a 2x canvas with a scale wrapper.
  const scaled = (
    <div style={{ width: W * S, height: H * S, display: "flex" }}>
      <div style={{ width: W, height: H, display: "flex", transform: `scale(${S})`, transformOrigin: "top left" }}>
        {tree}
      </div>
    </div>
  );

  const image = new ImageResponse(scaled, {
    width: W * S,
    height: H * S,
    fonts: [
      { name: "Bodoni", data: bodoni, weight: 700, style: "normal" },
      { name: "Archivo", data: archivo, weight: 400, style: "normal" },
      { name: "Archivo", data: archivo6, weight: 600, style: "normal" },
      { name: "Plex", data: plex, weight: 600, style: "normal" },
    ],
  });

  const png = Buffer.from(await image.arrayBuffer());
  const jpeg = await sharp(png).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=3600" },
  });
}
