// Broadcast production model shared by API and UI.

export type SegmentType =
  | "open" | "headlines" | "package" | "vo" | "vosot" | "interview"
  | "weather" | "sports" | "breaking" | "toss" | "break" | "outro";

export const SEGMENT_TYPES: { id: SegmentType; label: string; blurb: string; defaultSeconds: number; storyBacked: boolean }[] = [
  { id: "open", label: "Show Open", blurb: "Title sequence and anchor welcome.", defaultSeconds: 30, storyBacked: false },
  { id: "headlines", label: "Headlines", blurb: "Top stories at a glance.", defaultSeconds: 45, storyBacked: false },
  { id: "package", label: "Package", blurb: "Full reported story with video.", defaultSeconds: 120, storyBacked: true },
  { id: "vo", label: "VO", blurb: "Anchor voice-over video.", defaultSeconds: 30, storyBacked: true },
  { id: "vosot", label: "VO/SOT", blurb: "Voice-over into a sound bite.", defaultSeconds: 45, storyBacked: true },
  { id: "interview", label: "Interview", blurb: "Live or taped guest.", defaultSeconds: 180, storyBacked: true },
  { id: "weather", label: "Weather", blurb: "Forecast segment (auto-filled).", defaultSeconds: 60, storyBacked: false },
  { id: "sports", label: "Sports", blurb: "Scores and highlights.", defaultSeconds: 60, storyBacked: false },
  { id: "breaking", label: "Breaking", blurb: "Breaking news insert.", defaultSeconds: 60, storyBacked: true },
  { id: "toss", label: "Toss", blurb: "Handoff between anchors or to a reporter.", defaultSeconds: 15, storyBacked: false },
  { id: "break", label: "Break", blurb: "Commercial or bumper.", defaultSeconds: 30, storyBacked: false },
  { id: "outro", label: "Close", blurb: "Sign-off and credits.", defaultSeconds: 30, storyBacked: false },
];

export function segMeta(type: string) {
  return SEGMENT_TYPES.find((s) => s.id === type) || SEGMENT_TYPES[2];
}

export const EPISODE_STATUS: { id: string; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "ready", label: "Ready" },
  { id: "live", label: "On Air" },
  { id: "aired", label: "Aired" },
  { id: "archived", label: "Archived" },
];

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// Running total helper: given ordered segments, return cumulative start times and grand total.
export function runtimes(segs: { est_seconds: number }[]): { starts: number[]; total: number } {
  const starts: number[] = [];
  let acc = 0;
  for (const s of segs) {
    starts.push(acc);
    acc += s.est_seconds || 0;
  }
  return { starts, total: acc };
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The default recurring show, used to seed a first template so the feature is usable immediately.
export const DEFAULT_TEMPLATE_SEGMENTS = [
  { type: "open", title: "Show Open", est_seconds: 30 },
  { type: "headlines", title: "Today's Headlines", est_seconds: 45 },
  { type: "package", title: "Lead Story", est_seconds: 150 },
  { type: "package", title: "Second Story", est_seconds: 120 },
  { type: "vosot", title: "Regional Brief", est_seconds: 45 },
  { type: "interview", title: "Guest Interview", est_seconds: 240 },
  { type: "break", title: "Break", est_seconds: 30 },
  { type: "weather", title: "Weather", est_seconds: 60 },
  { type: "sports", title: "Sports", est_seconds: 60 },
  { type: "package", title: "Faith & Culture", est_seconds: 120 },
  { type: "outro", title: "Close", est_seconds: 30 },
];
