"use client";

import Shell from "@/components/Shell";
import { useMe } from "@/lib/client";
import { Monitor, Smartphone, Image as ImageIcon, ExternalLink, FileText, Copy, Check } from "lucide-react";
import { useState } from "react";

// The broadcast tools are self-contained HTML apps served from /broadcast on this domain. This
// page is the launcher: open each one, and for the two OBS overlays it shows the exact program
// URL (the source) and control URL (?panel dock) to paste into OBS. Hosting them here means OBS
// can point at the live URL instead of a local file, so updates flow without re-adding sources.

const TOOLS = [
  {
    id: "broadcast",
    title: "Control Room",
    tag: "16:9 · OBS 1920x1080",
    icon: Monitor,
    file: "/broadcast/dot1-news-broadcast.html",
    blurb: "The full lower-thirds, breaking, ticker, quotes, weather, sports, and standby control surface. Add the program URL as a browser source, then dock the control URL beside your preview.",
    obs: true,
  },
  {
    id: "vertical",
    title: "Vertical Frame",
    tag: "9:16 · OBS 1080x1920",
    icon: Smartphone,
    file: "/broadcast/dot1-news-vertical.html",
    blurb: "The tall overlay for TikTok, Reels, and Shorts. Same dock-and-program split as the control room, sized for a vertical second profile in OBS.",
    obs: true,
  },
  {
    id: "thumbnail",
    title: "Thumbnail Studio",
    tag: "YouTube · Facebook",
    icon: ImageIcon,
    file: "/broadcast/thumbnail-studio.html",
    blurb: "Build thumbnails for YouTube (1280x720) and Facebook (1200x630) with the three D1N layouts. Open it, design, and export a clean PNG.",
    obs: false,
  },
];

const GUIDES = [
  { label: "Operator Cheat Sheet", file: "/broadcast/guides/Dot1-News-Cheat-Sheet.pdf" },
  { label: "Show Day Guide", file: "/broadcast/guides/Dot1-News-Show-Day-Guide.pdf" },
  { label: "Live Production Cheat Sheet", file: "/broadcast/guides/Dot1-News-Live-Production-Cheat-Sheet.pdf" },
];

export default function BroadcastPage() {
  const { can } = useMe();
  const [origin, setOrigin] = useState("");
  if (typeof window !== "undefined" && !origin) setOrigin(window.location.origin);

  return (
    <Shell title="Broadcast" subtitle="Your live production tools, hosted and ready for OBS.">
      {!can("broadcast.view") ? (
        <div className="card pad muted tiny">You do not have access to the broadcast tools.</div>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 14, marginBottom: 22 }}>
            {TOOLS.map((t) => (
              <ToolCard key={t.id} tool={t} origin={origin} />
            ))}
          </div>

          <div className="card pad">
            <div className="mini" style={{ marginBottom: 12 }}>GUIDES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {GUIDES.map((g) => (
                <a key={g.file} className="btn ghost sm" href={g.file} target="_blank" rel="noreferrer">
                  <FileText size={14} /> {g.label}
                </a>
              ))}
            </div>
          </div>

          <div className="card pad" style={{ marginTop: 14 }}>
            <div className="mini" style={{ marginBottom: 10 }}>HOW THE DOCK WORKS</div>
            <div className="tiny muted" style={{ lineHeight: 1.6, maxWidth: 720 }}>
              Each overlay runs in two roles from the same URL. Add the <b>program URL</b> as an OBS browser
              source at full size; it renders clean and transparent. Add the <b>control URL</b> (the same
              address with <span className="mono">?panel</span>) as a Custom Browser Dock beside your preview.
              Type in the dock and the program updates live. Never put <span className="mono">?panel</span> on
              the source itself, only on the dock.
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}

function ToolCard({ tool, origin }: { tool: any; origin: string }) {
  const Icon = tool.icon;
  const programUrl = origin + tool.file;
  const controlUrl = origin + tool.file + "?panel";

  return (
    <div className="card pad">
      <div className="row-between">
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 9, background: "rgba(200,162,74,.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon size={20} color="var(--gold)" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="disp" style={{ fontSize: 19, fontWeight: 700 }}>{tool.title}</span>
              <span className="mono tiny" style={{ color: "var(--dim)" }}>{tool.tag}</span>
            </div>
            <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5, maxWidth: 640 }}>{tool.blurb}</div>
          </div>
        </div>
        <a className="btn primary sm" href={tool.file} target="_blank" rel="noreferrer" style={{ flex: "none" }}>
          <ExternalLink size={14} /> Open
        </a>
      </div>

      {tool.obs && origin && (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <UrlRow label="Program URL (OBS source)" url={programUrl} />
          <UrlRow label="Control URL (OBS dock)" url={controlUrl} />
        </div>
      )}
    </div>
  );
}

function UrlRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span className="mono tiny" style={{ color: "var(--dim)", width: 168, flex: "none" }}>{label}</span>
      <code className="mono tiny" style={{ flex: 1, background: "#17130f", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</code>
      <button className="btn ghost sm" onClick={copy} style={{ flex: "none" }}>
        {copied ? <Check size={13} color="#8fd6a8" /> : <Copy size={13} />}
      </button>
    </div>
  );
}
