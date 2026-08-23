// Shared definitions for the newsroom workflow, used by both API and UI so they never drift.

export type StoryStatus =
  | "tip" | "assessment" | "assigned" | "reporting" | "verification"
  | "script" | "review" | "ready" | "published" | "archived";

export const STORY_LIFECYCLE: { id: StoryStatus; label: string }[] = [
  { id: "tip", label: "Tip Received" },
  { id: "assessment", label: "Assessment" },
  { id: "assigned", label: "Assigned" },
  { id: "reporting", label: "Reporting" },
  { id: "verification", label: "Verification" },
  { id: "script", label: "Script / Article" },
  { id: "review", label: "Editorial Review" },
  { id: "ready", label: "Ready" },
  { id: "published", label: "Published / Broadcast" },
  { id: "archived", label: "Archived" },
];

// Non-linear flags that can apply on top of the lifecycle stage.
export type StoryFlag = "hold" | "killed" | "needs_follow_up" | "correction_required" | "updated";
export const STORY_FLAGS: { id: StoryFlag; label: string }[] = [
  { id: "hold", label: "Hold" },
  { id: "killed", label: "Killed" },
  { id: "needs_follow_up", label: "Needs Follow-Up" },
  { id: "correction_required", label: "Correction Required" },
  { id: "updated", label: "Updated" },
];

export type Classification = "news" | "analysis" | "opinion";
export const CLASSIFICATIONS: { id: Classification; label: string; blurb: string }[] = [
  { id: "news", label: "News", blurb: "Factual reporting based on verified information and original reporting." },
  { id: "analysis", label: "Analysis", blurb: "Interpretation or explanation based on established facts, clearly identified as analysis." },
  { id: "opinion", label: "Opinion", blurb: "Commentary or viewpoint content, clearly separated from straight reporting." },
];

export type Priority = "routine" | "developing" | "high" | "breaking" | "emergency";
export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "routine", label: "Routine" },
  { id: "developing", label: "Developing" },
  { id: "high", label: "High" },
  { id: "breaking", label: "Breaking" },
  { id: "emergency", label: "Emergency" },
];

// News app categories (must match the news_stories CHECK constraint on publish).
export const CATEGORIES = ["world", "politics", "faith", "culture", "technology", "health", "business", "environment"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SOURCE_TYPES = [
  "primary", "government_document", "public_record", "interview", "eyewitness",
  "expert", "organization", "press_release", "secondary_reporting", "dataset", "other",
] as const;
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  primary: "Primary source", government_document: "Government document", public_record: "Public record",
  interview: "Interview", eyewitness: "Eyewitness", expert: "Expert", organization: "Organization",
  press_release: "Press release", secondary_reporting: "Secondary reporting", dataset: "Dataset", other: "Other",
};

export const ATTRIBUTIONS = ["on_record", "background", "anonymous"] as const;
export const RESPONSE_STATES = ["pending", "responded", "declined", "no_response"] as const;

export const EVIDENCE_KINDS = [
  "document", "pdf", "government_record", "photograph", "video", "audio",
  "interview_recording", "screenshot", "url", "research_note",
] as const;

export type ClaimStatus = "confirmed" | "unconfirmed" | "disputed" | "false";
export const CLAIM_STATES: { id: ClaimStatus; label: string }[] = [
  { id: "confirmed", label: "Confirmed" },
  { id: "unconfirmed", label: "Unconfirmed" },
  { id: "disputed", label: "Disputed" },
  { id: "false", label: "False" },
];

export type ReviewState = "not_verified" | "partially_verified" | "verified" | "editor_approved" | "ready_to_publish";
export const REVIEW_STATES: { id: ReviewState; label: string }[] = [
  { id: "not_verified", label: "Not Verified" },
  { id: "partially_verified", label: "Partially Verified" },
  { id: "verified", label: "Verified" },
  { id: "editor_approved", label: "Editor Approved" },
  { id: "ready_to_publish", label: "Ready to Publish" },
];

// The editorial review checklist. Order is display order. All must be true before Ready to Publish
// unless an authorized editor overrides with a logged reason.
export const REVIEW_ITEMS: { id: string; label: string }[] = [
  { id: "names_verified", label: "Names verified" },
  { id: "dates_times_verified", label: "Dates / times verified" },
  { id: "locations_verified", label: "Locations verified" },
  { id: "quotes_checked", label: "Quotes checked" },
  { id: "primary_sources_reviewed", label: "Primary sources reviewed" },
  { id: "claims_corroborated", label: "Important claims corroborated" },
  { id: "perspectives_contacted", label: "Opposing / relevant perspectives contacted" },
  { id: "response_requested", label: "Response requested from anyone accused or criticized" },
  { id: "photos_video_verified", label: "Photos / video verified" },
  { id: "rights_confirmed", label: "Copyright / usage rights confirmed" },
  { id: "conflicts_disclosed", label: "Conflicts disclosed" },
  { id: "classification_selected", label: "Story classification selected" },
  { id: "legal_reviewed", label: "Legal / editorial concerns reviewed" },
  { id: "headline_accurate", label: "Headline accurately represents story" },
  { id: "corrections_checked", label: "Corrections history checked" },
];

export function reviewComplete(items: Record<string, boolean> | null | undefined): boolean {
  if (!items) return false;
  return REVIEW_ITEMS.every((it) => items[it.id] === true);
}

export function reviewProgress(items: Record<string, boolean> | null | undefined): { done: number; total: number } {
  const total = REVIEW_ITEMS.length;
  if (!items) return { done: 0, total };
  return { done: REVIEW_ITEMS.filter((it) => items[it.id] === true).length, total };
}

// The public standards pages, seeded on first load and editable by those with standards.edit.
export const STANDARDS_PAGES: { slug: string; title: string }[] = [
  { slug: "editorial-standards", title: "Editorial Standards" },
  { slug: "corrections", title: "Corrections & Clarifications" },
  { slug: "ownership-funding", title: "Ownership & Funding" },
  { slug: "advertising-sponsorship", title: "Advertising & Sponsorship Policy" },
  { slug: "news-tip", title: "Submit a News Tip" },
  { slug: "contact", title: "Contact the Newsroom" },
];

export const CORE_STANDARDS: string[] = [
  "Accuracy before speed",
  "Corroborate consequential claims",
  "Identify sources whenever reasonably possible",
  "Clearly identify and justify anonymous sourcing",
  "Seek comment from people or institutions accused of wrongdoing",
  "Clearly separate news reporting, analysis, and opinion",
  "Never manipulate quotations",
  "Never deceptively edit photographs, video, or audio",
  "Correct factual errors publicly and transparently",
  "Disclose conflicts of interest",
  "Clearly disclose sponsored or paid material",
  "Respect legitimate privacy concerns",
  "Attribute reporting originating from other organizations",
  "Maintain documentation supporting significant reporting",
];
