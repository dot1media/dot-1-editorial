/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { META } from "@/lib/social/meta";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public route: renders the branded Dot 1 News post card for a queued social
// post as a JPEG (Instagram requires JPEG). The Graph API fetches this URL when
// publishing. Layout mirrors the approved template: masthead, the article photo,
// crimson category kicker, verification dot, Bodoni headline, handle footer.

const INK = "#141210";
const CRIMSON = "#B81616";
const BONE = "#F4F0E7";
const GOLD = "#C8A24A";
const MUTED = "#9A9186";
const HAIR = "#2A2520";

const VCOL: Record<string, string> = {
  verified: GOLD,
  pending: "#E08A2B",
  unverified: "#C8372A",
};
const VLABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Pending verification",
  unverified: "Unverified",
};

const FORMATS: Record<string, { w: number; h: number; photoH: number; head: number; pad: number }> = {
  ig_portrait: { w: 1080, h: 1350, photoH: 560, head: 62, pad: 64 },
  ig_square: { w: 1080, h: 1080, photoH: 470, head: 50, pad: 56 },
  fb_landscape: { w: 1200, h: 630, photoH: 400, head: 40, pad: 48 },
};

async function asset(origin: string, name: string): Promise<ArrayBuffer> {
  const res = await fetch(new URL(`/social-assets/${name}`, origin));
  if (!res.ok) throw new Error(`asset ${name}: ${res.status}`);
  return res.arrayBuffer();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const origin = url.origin;
  const fmtKey = url.searchParams.get("format") || "ig_portrait";
  const fmt = FORMATS[fmtKey] || FORMATS.ig_portrait;

  await ensureSchema();
  const rows = (await sql`SELECT * FROM social_posts WHERE id = ${id} LIMIT 1`) as any[];
  if (!rows.length) return new Response("Not found", { status: 404 });
  const post = rows[0];

  const vstatus = (post.verification_status || "verified") as string;
  const vcol = VCOL[vstatus] || GOLD;
  const vlabel = VLABEL[vstatus] || "Verified";
  const category = String(post.category || "News").toUpperCase();
  const headline = String(post.headline || "");
  const summary = String(post.summary || "");
  const photo = String(post.image_url || "");
  const globeRed = new URL("/social-assets/globe-red.png", origin).toString();
  const globeBone = new URL("/social-assets/globe-bone.png", origin).toString();
  const portrait = fmtKey === "ig_portrait";

  const [bodoni, archivo, archivo6, plex] = await Promise.all([
    asset(origin, "Bodoni-700.ttf"),
    asset(origin, "Archivo-400.ttf"),
    asset(origin, "Archivo-600.ttf"),
    asset(origin, "Plex-600.ttf"),
  ]);

  const sideFs = portrait ? 44 : 34;
  const globeH = portrait ? 52 : 40;
  const globeW = Math.round((globeH * 449) / 1024);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: fmt.w,
          height: fmt.h,
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          fontFamily: "Archivo",
          position: "relative",
        }}
      >
        {/* masthead */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: portrait ? 40 : 22, paddingBottom: portrait ? 16 : 8 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: sideFs, letterSpacing: portrait ? 6 : 4 }}>DOT</span>
            <img src={globeRed} width={globeW} height={globeH} style={{ marginLeft: portrait ? 10 : 7, marginRight: portrait ? 10 : 7 }} alt="" />
            <span style={{ fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: sideFs, letterSpacing: portrait ? 6 : 4 }}>NEWS</span>
          </div>
          <span style={{ fontFamily: "Plex", fontWeight: 600, color: GOLD, fontSize: portrait ? 14 : 12, letterSpacing: portrait ? 5 : 3, marginTop: portrait ? 10 : 5 }}>A DECLARED STANDPOINT</span>
        </div>

        {/* crimson rule */}
        <div style={{ display: "flex", height: 2, backgroundColor: CRIMSON, marginLeft: fmt.pad, marginRight: fmt.pad }} />

        {/* photo */}
        <div style={{ display: "flex", position: "relative", width: fmt.w, height: fmt.photoH, marginTop: portrait ? 18 : 8 }}>
          <img src={photo} width={fmt.w} height={fmt.photoH} style={{ objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", left: fmt.pad, bottom: 18, display: "flex", backgroundColor: CRIMSON, color: BONE, fontFamily: "Plex", fontWeight: 600, fontSize: portrait ? 16 : 13, letterSpacing: 3, padding: "7px 14px" }}>{category}</div>
          <div style={{ position: "absolute", right: fmt.pad, top: 18, width: portrait ? 26 : 20, height: portrait ? 26 : 20, borderRadius: 999, backgroundColor: vcol }} />
        </div>

        {/* body */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, paddingLeft: fmt.pad, paddingRight: fmt.pad, paddingTop: portrait ? 30 : 18, paddingBottom: portrait ? 104 : 78 }}>
          <div style={{ display: "flex", fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: fmt.head, lineHeight: 1.08 }}>{headline}</div>
          {summary ? (
            <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 400, color: MUTED, fontSize: portrait ? 24 : 19, lineHeight: 1.45, marginTop: portrait ? 18 : 10 }}>{summary}</div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", marginTop: portrait ? 20 : 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: vcol }} />
            <span style={{ fontFamily: "Archivo", fontWeight: 600, color: MUTED, fontSize: portrait ? 18 : 15, marginLeft: 10 }}>{vlabel} · Dot 1 Newsroom</span>
          </div>
        </div>

        {/* footer */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: fmt.pad, paddingRight: fmt.pad, paddingTop: portrait ? 22 : 14, paddingBottom: portrait ? 22 : 14, borderTop: `1px solid ${HAIR}`, backgroundColor: INK }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={globeBone} width={Math.round((30 * 449) / 1024)} height={30} alt="" />
            <span style={{ fontFamily: "Bodoni", fontWeight: 700, color: BONE, fontSize: 22, letterSpacing: 3, marginLeft: 10 }}>DOT 1 NEWS</span>
          </div>
          <span style={{ fontFamily: "Plex", fontWeight: 600, color: MUTED, fontSize: 15, letterSpacing: 1.5 }}>@{META.handle} · news.dot1.media</span>
        </div>
      </div>
    ),
    {
      width: fmt.w,
      height: fmt.h,
      fonts: [
        { name: "Bodoni", data: bodoni, weight: 700, style: "normal" },
        { name: "Archivo", data: archivo, weight: 400, style: "normal" },
        { name: "Archivo", data: archivo6, weight: 600, style: "normal" },
        { name: "Plex", data: plex, weight: 600, style: "normal" },
      ],
    },
  );

  const png = Buffer.from(await image.arrayBuffer());
  const jpeg = await sharp(png).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=3600",
    },
  });
}
