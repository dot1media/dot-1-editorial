"use client";

import Shell from "@/components/Shell";

// Staff guide: how content moves through the newsroom, who does each task, and how to troubleshoot.
// Visuals are clean SVG illustrations of the real screens (not live captures) so the doc stays
// current and legible on any theme.

const GOLD = "#c8a24a", CRIMSON = "#b81616", BONE = "#f4f0e7", MUTED = "#8f887c";

const ROLE_COLOR: Record<string, string> = {
  Owner: GOLD, Editor: CRIMSON, Reporter: "#6ea8fe", Producer: "#5bbf9a", Viewer: MUTED, Auto: "#b98cff",
};

function Roles({ who }: { who: string[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0 12px" }}>
      <span className="tiny muted" style={{ marginRight: 2 }}>Who:</span>
      {who.map((r) => (
        <span key={r} style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".02em", padding: "2px 8px", borderRadius: 999,
          color: ROLE_COLOR[r] || BONE, border: "1px solid " + (ROLE_COLOR[r] || BONE) + "55", background: (ROLE_COLOR[r] || BONE) + "14" }}>
          {r === "Auto" ? "Automatic" : r}
        </span>
      ))}
    </div>
  );
}

function Section({ title, who, children }: { title: string; who?: string[]; children: React.ReactNode }) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="disp" style={{ fontSize: 19, fontWeight: 700, marginBottom: who ? 6 : 10 }}>{title}</div>
      {who && <Roles who={who} />}
      <div style={{ fontSize: 14.5, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: "0 0 12px" }}>{children}</p>;

function Frame({ w, h, title, children }: { w: number; h: number; title: string; children: React.ReactNode }) {
  return (
    <svg viewBox={"0 0 " + w + " " + h} style={{ width: "100%", height: "auto", margin: "4px 0 14px", display: "block" }} xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width={w - 2} height={h - 2} rx="10" fill="#00000022" stroke={BONE + "22"} />
      <rect x="1" y="1" width={w - 2} height="26" rx="10" fill={BONE + "0c"} />
      <circle cx="16" cy="14" r="3.5" fill={CRIMSON} /><circle cx="28" cy="14" r="3.5" fill={GOLD} /><circle cx="40" cy="14" r="3.5" fill={BONE + "55"} />
      <text x={w / 2} y="18" textAnchor="middle" fontFamily="ui-sans-serif,system-ui" fontSize="11" fill={BONE + "aa"} letterSpacing="1">{title}</text>
      {children}
    </svg>
  );
}
const T = (p: any) => <text fontFamily="ui-sans-serif,system-ui" {...p}>{p.children}</text>;

function FlowDiagram() {
  const steps = [
    { x: 14, label: "Where it starts", lines: ["Reporter", "AI Desk", "Tip"] },
    { x: 168, label: "Review", lines: ["claims", "checklist", "editor OK"] },
    { x: 322, label: "Dual-rate", lines: ["AI + human", "score"] },
    { x: 476, label: "Publish", lines: ["to news DB"] },
    { x: 630, label: "Readers", lines: ["news.dot1.media", "the app"] },
  ];
  return (
    <Frame w={770} h={150} title="HOW A STORY REACHES READERS">
      {steps.map((s, i) => (
        <g key={i}>
          <rect x={s.x} y="44" width="126" height="86" rx="8" fill={i === 4 ? GOLD + "18" : BONE + "0c"} stroke={i === 4 ? GOLD + "88" : BONE + "33"} />
          <T x={s.x + 63} y="66" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={i === 4 ? GOLD : BONE}>{s.label}</T>
          {s.lines.map((l, j) => <T key={j} x={s.x + 63} y={86 + j * 15} textAnchor="middle" fontSize="10.5" fill={BONE + "99"}>{l}</T>)}
          {i < 4 && <path d={"M " + (s.x + 128) + " 87 L " + (s.x + 150) + " 87"} stroke={GOLD + "bb"} strokeWidth="2" markerEnd="url(#ah)" />}
        </g>
      ))}
      <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={GOLD + "bb"} /></marker></defs>
    </Frame>
  );
}

function LadderDiagram() {
  const steps = ["Not Verified", "Partially Verified", "Verified", "Editor Approved", "Ready to Publish"];
  return (
    <Frame w={770} h={92} title="THE REVIEW LADDER (COMPUTED AUTOMATICALLY)">
      <line x1="30" y1="60" x2="740" y2="60" stroke={BONE + "33"} strokeWidth="2" />
      {steps.map((s, i) => {
        const x = 40 + i * 172; const last = i === 4;
        return (
          <g key={i}>
            <circle cx={x} cy="60" r={last ? 8 : 6} fill={last ? GOLD : BONE + "55"} />
            <T x={x} y="48" textAnchor="middle" fontSize="11" fontWeight={last ? "700" : "400"} fill={last ? GOLD : BONE + "cc"}>{s}</T>
          </g>
        );
      })}
    </Frame>
  );
}

function DualRateDiagram() {
  return (
    <Frame w={770} h={150} title="DUAL-RATER — SCORE TAB">
      <rect x="20" y="40" width="180" height="44" rx="7" fill={BONE + "0c"} stroke={BONE + "33"} />
      <T x="34" y="60" fontSize="12" fontWeight="700" fill={BONE}>AI scorer</T>
      <T x="34" y="76" fontSize="10.5" fill={BONE + "99"}>BAI 8 · PSI 6 · SCI 7 · HII 8</T>
      <rect x="20" y="92" width="180" height="44" rx="7" fill={BONE + "0c"} stroke={BONE + "33"} />
      <T x="34" y="112" fontSize="12" fontWeight="700" fill={BONE}>You (human)</T>
      <T x="34" y="128" fontSize="10.5" fill={BONE + "99"}>BAI 7 · PSI 6 · SCI 7 · HII 8</T>
      <path d="M 205 88 L 250 88" stroke={GOLD + "bb"} strokeWidth="2" markerEnd="url(#ah2)" />
      <rect x="255" y="62" width="210" height="52" rx="8" fill={GOLD + "18"} stroke={GOLD + "88"} />
      <T x="360" y="84" textAnchor="middle" fontSize="12" fontWeight="700" fill={GOLD}>Reconciled</T>
      <T x="360" y="102" textAnchor="middle" fontSize="10.5" fill={BONE + "bb"}>close raters → averaged</T>
      <rect x="490" y="62" width="260" height="52" rx="8" fill={CRIMSON + "14"} stroke={CRIMSON + "66"} />
      <T x="620" y="84" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={BONE}>if far apart</T>
      <T x="620" y="102" textAnchor="middle" fontSize="10.5" fill={BONE + "bb"}>a third rating breaks the tie</T>
      <defs><marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={GOLD + "bb"} /></marker></defs>
    </Frame>
  );
}

function AiDeskMock() {
  return (
    <Frame w={770} h={190} title="AI DESK">
      <rect x="600" y="40" width="150" height="26" rx="6" fill={CRIMSON} />
      <T x="675" y="57" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">Generate now</T>
      <T x="20" y="58" fontSize="12" fill={BONE + "aa"}>Recent AI drafts</T>
      {["Borough approves budget", "Salmon run tops five-year avg", "Assembly debates rezoning"].map((t, i) => (
        <g key={i}>
          <rect x="20" y={72 + i * 34} width="730" height="30" rx="6" fill={BONE + "08"} stroke={BONE + "1c"} />
          <T x="34" y={91 + i * 34} fontSize="12" fontWeight="600" fill={BONE}>{t}</T>
          <T x="470" y={91 + i * 34} fontSize="10.5" fill={BONE + "88"}>verification</T>
          <T x="600" y={91 + i * 34} fontSize="10.5" fill={GOLD + "cc"}>score 29</T>
          <T x="690" y={91 + i * 34} fontSize="10.5" fill={BONE + "88"}>open</T>
        </g>
      ))}
    </Frame>
  );
}

function PublishedMock() {
  return (
    <Frame w={770} h={180} title="PUBLISHED — MANAGE WHAT'S LIVE">
      {["Articles", "Photos", "Videos"].map((t, i) => (
        <g key={i}><rect x={20 + i * 92} y="40" width="84" height="24" rx="6" fill={i === 0 ? CRIMSON : BONE + "0c"} stroke={i === 0 ? "none" : BONE + "33"} />
          <T x={62 + i * 92} y="56" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={i === 0 ? "#fff" : BONE + "cc"}>{t}</T></g>
      ))}
      <rect x="560" y="40" width="190" height="24" rx="6" fill={BONE + "08"} stroke={BONE + "22"} /><T x="574" y="56" fontSize="11" fill={BONE + "77"}>Search…</T>
      {["Mat-Su budget passes", "Fisheries board ruling", "Storm warning issued"].map((t, i) => (
        <g key={i}>
          <rect x="20" y={76 + i * 32} width="730" height="28" rx="6" fill={BONE + "08"} stroke={BONE + "1c"} />
          <T x="34" y={94 + i * 32} fontSize="12" fontWeight="600" fill={BONE}>{t}</T>
          <T x="560" y={94 + i * 32} fontSize="10.5" fill={GOLD + "bb"}>Edit</T>
          <T x="650" y={94 + i * 32} fontSize="10.5" fill={CRIMSON + "cc"}>Delete</T>
        </g>
      ))}
    </Frame>
  );
}

function GraphicsMock() {
  const panels = [{ t: "Logo bug", on: true }, { t: "Ticker", on: true }, { t: "Breaking banner", on: false }];
  return (
    <Frame w={770} h={150} title="ON-AIR GRAPHICS → OBS OUTPUT">
      {panels.map((p, i) => (
        <g key={i}>
          <rect x={20 + i * 250} y="44" width="230" height="86" rx="8" fill={BONE + "0a"} stroke={BONE + "2a"} />
          <T x={34 + i * 250} y="66" fontSize="12" fontWeight="700" fill={BONE}>{p.t}</T>
          <rect x={186 + i * 250} y="52" width="50" height="18" rx="9" fill={p.on ? GOLD + "22" : BONE + "12"} stroke={p.on ? GOLD + "88" : BONE + "33"} />
          <T x={211 + i * 250} y="65" textAnchor="middle" fontSize="9.5" fill={p.on ? GOLD : BONE + "88"}>{p.on ? "ON AIR" : "OFF"}</T>
          <rect x={34 + i * 250} y="98" width="56" height="22" rx="6" fill={GOLD} /><T x={62 + i * 250} y="113" textAnchor="middle" fontSize="11" fontWeight="700" fill="#141210">Show</T>
          <rect x={98 + i * 250} y="98" width="56" height="22" rx="6" fill={BONE + "12"} stroke={BONE + "33"} /><T x={126 + i * 250} y="113" textAnchor="middle" fontSize="11" fill={BONE + "cc"}>Hide</T>
        </g>
      ))}
    </Frame>
  );
}

export default function GuidePage() {
  return (
    <Shell title="Newsroom Guide" subtitle="How content reaches readers, who does each task, and what to do when something looks wrong.">
      <div style={{ maxWidth: 860 }}>

        <Section title="Printable handouts">
          <P>Print these or hand them to a new person. They stay in sync with this guide.</P>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn primary sm" href="/docs/Dot1Media-Employee-Handbook.pdf" target="_blank" rel="noreferrer">Employee Handbook (full)</a>
            <a className="btn primary sm" href="/docs/Dot1News-Newsroom-QuickStart.pdf" target="_blank" rel="noreferrer">Newsroom Quick Start (2 pages)</a>
            <a className="btn primary sm" href="/docs/Dot1News-Broadcast-Guide.pdf" target="_blank" rel="noreferrer">Live Broadcast Guide (ATEM + OBS)</a>
          </div>
        </Section>

        <Section title="The big picture">
          <FlowDiagram />
          <P>A story can start three ways: a reporter writes it, the <b>AI Desk</b> generates it from the wire, or it arrives as a public <b>tip</b>. However it starts, it moves through the same pipeline: reporting and sources, then verification, then editorial review, then scoring, then publication.</P>
          <P>Publishing writes the story into the news database that powers <b>news.dot1.media</b> and the app. Nothing reaches readers without clearing review. This portal is the newsroom; the app and website only display what the portal publishes.</P>
        </Section>

        <Section title="Create or report a story" who={["Reporter", "Editor", "Owner"]}>
          <P>Create a story from Stories, then work the tabs: sources, evidence, the reporting log, verification claims, the script, the D1-4LS score, and the review checklist. Reporters do the reporting; editors can do everything a reporter can and more.</P>
        </Section>

        <Section title="Generate drafts from the wire (AI Desk)" who={["Reporter", "Editor", "Owner"]}>
          <AiDeskMock />
          <P>Open AI Desk and press Generate now. It pulls the wire, writes drafts, scores them, and drops each in as a story in the Verification stage marked as AI. A schedule also generates automatically in the background. AI drafts are ordinary stories: they go through the full review workflow before anything publishes.</P>
        </Section>

        <Section title="Triage tips and promote them" who={["Reporter", "Editor", "Owner"]}>
          <P>Public tips from the app, the news site, and the main site land in Tips. Anyone can read them; turning a tip into a story is a reporter or editor action. Triage there and promote the good ones.</P>
        </Section>

        <Section title="Verify and move a story up the ladder" who={["Reporter", "Editor", "Owner"]}>
          <LadderDiagram />
          <P>The review status is computed from the actual work, not set by hand. Handle the verification claims (Confirmed, Unconfirmed, Disputed, False) and complete the checklist, and the story climbs the ladder on its own. Reporters and editors both do this.</P>
        </Section>

        <Section title="Approve for publication" who={["Editor", "Owner"]}>
          <P>The final human gate, editor approval, is what lifts a story to Ready to Publish. This is an editor (or owner) action; reporters do the verification, editors sign off.</P>
        </Section>

        <Section title="Score a story and add the second rating" who={["Reporter", "Editor", "Owner"]}>
          <DualRateDiagram />
          <P>Every story gets a D1-4LS score: four indices, five indicators each, 0 to 2, out of 40. It informs the editor; it doesn't decide. Scoring is dual-rated: on an AI story the AI scorer is the first rater automatically. A person adds the second on the Score tab, set the indicators, then Submit my rating. Close raters average; if they diverge, a third breaks the tie. Reporters and editors can rate.</P>
        </Section>

        <Section title="Publish" who={["Editor", "Owner", "Auto"]}>
          <P>Human stories publish from the story once Ready to Publish, an editor action. Publishing early needs the override capability and a written reason. <b>AI stories auto-publish</b>: the moment one is both Ready to Publish and dual-rate complete, it posts on its own. Published stories show a gold mark in the app, "Verified by two independent raters" or "Approved by an editor."</P>
        </Section>

        <Section title="Manage what's already live (Published)" who={["Reporter", "Editor", "Owner"]}>
          <PublishedMock />
          <P>The Published section shows everything on the news site, including older articles from before this system. View is open to everyone; editing an article (headline, summary, body, category, byline, hero image) is a reporter/editor action; deleting articles or media is an editor action. <b>Edits and deletes are immediate and permanent on the live site</b>, no draft, no undo. Scores aren't edited here; re-scoring goes through the workflow.</P>
        </Section>

        <Section title="Run the on-air graphics (broadcast)" who={["Producer", "Owner"]}>
          <GraphicsMock />
          <P>Lower thirds come from a rundown: open an episode, pick a segment, and use Take to air and Clear. The bug, ticker, and breaking banner come from Broadcast, then On-air graphics. Both reach OBS through a server bus, because OBS runs its own browser that can't share with yours. Point an OBS browser source at the overlay output; pushes appear within a second. This is a producer action, editors can watch the broadcast area but don't drive graphics.</P>
          <P><b>Two formats, one control.</b> There are two overlays, a 16:9 program and a 9:16 vertical for TikTok, Reels, and Shorts. Both read the same bus, so a single push drives both at once. On the vertical, the ticker shows as a headline strap instead of a crawl. Get both OBS URLs from Broadcast, then Live tools, and see the printable Live Broadcast Guide above for the full ATEM, camera, and audio setup.</P>
        </Section>

        <Section title="Publish a recorded episode" who={["Producer", "Editor", "Owner"]}>
          <P>Recorded shows are produced the way you'd expect: record in OBS or the ATEM, edit and color in DaVinci, and export the finished cut. Then in Broadcast, then Publish episode, add a title, description, category, and host, drop in the exported file, and press Upload &amp; publish (or save as draft).</P>
          <P>The file uploads straight to Cloudflare Stream (resumable, so a large export is fine), which encodes it and makes the thumbnail. It appears in the app and site once ready, and lives under Published, then Videos, where it can be edited or removed like any other video. Same video pipeline as live; nothing extra to set up.</P>
        </Section>

        <Section title="Go live to the site and app" who={["Producer", "Owner"]}>
          <P>Live streaming runs through Cloudflare Stream. One-time, a maintainer sets the Cloudflare keys on the portal, then a producer opens Broadcast, then Go live, and presses Set up live input once. That returns an OBS Server URL and a Stream key (keep the key private).</P>
          <P>To broadcast: put that Server and Stream key into OBS (Settings, Stream, service Custom), Start Streaming, then press <b>Go live</b> in the portal and give it a title. A Live surface appears on news.dot1.media and as a red LIVE banner in the app within seconds. Push lower thirds, bug, ticker, and breaking from On-air graphics exactly as normal. Press <b>End broadcast</b> when done; Cloudflare keeps the recording, which can become a posted episode.</P>
          <P>Two normal things: there's a short beat after OBS connects before the stream is playable, and live video always runs a little behind real time. See the printable Live Broadcast Guide above for the full step-by-step.</P>
        </Section>

        <Section title="Standards, corrections, accounts, audit" who={["Editor", "Owner"]}>
          <P>Editing the public standards and issuing corrections are editor actions. The audit log is visible to editors and owners. Managing accounts, granting roles and per-person capabilities, is an owner action from the Accounts page.</P>
        </Section>

        <Section title="Troubleshooting">
          <P><b>AI Desk says "not configured."</b> The generation key isn't set on the portal's hosting. A maintainer adds it.</P>
          <P><b>An AI draft won't auto-publish.</b> It needs both halves: Ready to Publish (claims handled, checklist complete, editor approved) and a complete dual-rate (a second human rating). Open the story and check the review status and the Dual-Rater panel.</P>
          <P><b>A published story shows no gold mark.</b> It was published before the provenance update, or never got a second rating. New stories that clear the dual-rater show the mark; you can re-open and re-publish.</P>
          <P><b>Graphics don't show in OBS.</b> Hard-refresh the OBS browser source so it reloads the overlay, confirm the source points at the overlay output, and confirm you have broadcast permissions.</P>
          <P><b>A story won't publish.</b> It isn't Ready to Publish. Finish claims, checklist, and editor approval. Publishing earlier needs the override capability and a reason.</P>
          <P><b>A page or button isn't there.</b> It's gated to your role. Ask an Owner to grant the capability from Accounts.</P>
          <P><b>Published edit or delete says unavailable.</b> The portal's connection to the news database isn't set on the hosting. A maintainer configures it.</P>
          <P><b>Tips aren't arriving.</b> Confirm the sending site points at the tip endpoint. Arrivals show under Tips; if a site can send but nothing appears, tell a maintainer.</P>
        </Section>

        <Section title="Roles at a glance">
          <P><b style={{ color: GOLD }}>Owner</b> — everything, and grants access to others. Cannot be locked out.</P>
          <P><b style={{ color: CRIMSON }}>Editor</b> — reviews, approves, publishes, manages corrections and standards, sees the audit log.</P>
          <P><b style={{ color: "#6ea8fe" }}>Reporter</b> — creates and works stories: sources, evidence, verification, second ratings.</P>
          <P><b style={{ color: "#5bbf9a" }}>Producer</b> — runs the broadcast and on-air graphics.</P>
          <P><b style={{ color: MUTED }}>Viewer</b> — reads the newsroom without changing anything.</P>
          <P>Access is by capability, so an Owner can grant any single ability to any person from Accounts, regardless of role.</P>
        </Section>

      </div>
    </Shell>
  );
}
