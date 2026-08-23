// The permission model for the Dot One suite admin accounts.
//
// Two layers, by design:
//   1. ROLE gives a sensible fixed default set of capabilities (Owner, Editor, Reporter,
//      Producer, Viewer).
//   2. Per-account OVERRIDES sit on top: any single capability can be explicitly granted or
//      revoked for one person, regardless of their role.
//
// Effective capability = role default, then apply that account's overrides. Owner is absolute
// and ignores revokes (an Owner can always do everything, so the suite can never lock itself out).

export type Capability =
  // Story / newsroom workflow
  | "story.view"
  | "story.create"
  | "story.edit"
  | "story.assign"
  | "story.delete"
  | "story.changeStatus"
  // Sources, evidence, reporting log, verification
  | "sources.manage"
  | "evidence.manage"
  | "reportingLog.add"
  | "verification.manage"
  // Editorial review + publishing
  | "review.complete"
  | "review.approve" // editor approval step
  | "publish.toNews" // push to news.dot1.media
  | "publish.override" // bypass incomplete review with a logged reason
  | "corrections.manage"
  // Media
  | "media.upload"
  | "media.publish"
  // Standards (public policy pages)
  | "standards.edit"
  // Broadcast (phase two, capabilities defined now so roles are stable)
  | "broadcast.view"
  | "broadcast.manage"
  | "broadcast.golive"
  // Administration
  | "admin.manageAccounts"
  | "admin.viewAudit"
  | "admin.manageSettings";

export const ALL_CAPABILITIES: Capability[] = [
  "story.view", "story.create", "story.edit", "story.assign", "story.delete", "story.changeStatus",
  "sources.manage", "evidence.manage", "reportingLog.add", "verification.manage",
  "review.complete", "review.approve", "publish.toNews", "publish.override", "corrections.manage",
  "media.upload", "media.publish",
  "standards.edit",
  "broadcast.view", "broadcast.manage", "broadcast.golive",
  "admin.manageAccounts", "admin.viewAudit", "admin.manageSettings",
];

export type Role = "owner" | "editor" | "reporter" | "producer" | "viewer";

export const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: "owner", label: "Owner", blurb: "Full control of the newsroom and the suite. Cannot be restricted." },
  { id: "editor", label: "Editor", blurb: "Runs editorial review, approves, publishes, and manages corrections." },
  { id: "reporter", label: "Reporter", blurb: "Creates and reports stories: sources, evidence, notes, verification." },
  { id: "producer", label: "Producer", blurb: "Builds broadcasts and rundowns from approved stories." },
  { id: "viewer", label: "Viewer", blurb: "Read-only access to the newsroom. Sees work without changing it." },
];

const REPORTER_CAPS: Capability[] = [
  "story.view", "story.create", "story.edit",
  "sources.manage", "evidence.manage", "reportingLog.add", "verification.manage",
  "review.complete", "media.upload",
];

const EDITOR_CAPS: Capability[] = [
  ...REPORTER_CAPS,
  "story.assign", "story.changeStatus", "story.delete",
  "review.approve", "publish.toNews", "publish.override", "corrections.manage",
  "media.publish", "standards.edit", "broadcast.view", "admin.viewAudit",
];

const PRODUCER_CAPS: Capability[] = [
  "story.view", "reportingLog.add",
  "broadcast.view", "broadcast.manage", "broadcast.golive",
  "media.upload",
];

const VIEWER_CAPS: Capability[] = ["story.view", "broadcast.view"];

export const ROLE_DEFAULTS: Record<Role, Capability[]> = {
  owner: [...ALL_CAPABILITIES],
  editor: EDITOR_CAPS,
  reporter: REPORTER_CAPS,
  producer: PRODUCER_CAPS,
  viewer: VIEWER_CAPS,
};

export type Overrides = Partial<Record<Capability, boolean>>;

export interface AccountPermissions {
  role: Role;
  overrides: Overrides;
}

// Compute the full effective capability set for an account.
export function effectiveCapabilities(perm: AccountPermissions): Set<Capability> {
  if (perm.role === "owner") return new Set(ALL_CAPABILITIES);
  const set = new Set<Capability>(ROLE_DEFAULTS[perm.role] || []);
  for (const cap of ALL_CAPABILITIES) {
    const o = perm.overrides?.[cap];
    if (o === true) set.add(cap);
    if (o === false) set.delete(cap);
  }
  return set;
}

export function can(perm: AccountPermissions | null | undefined, cap: Capability): boolean {
  if (!perm) return false;
  if (perm.role === "owner") return true;
  return effectiveCapabilities(perm).has(cap);
}

// Human-readable groupings for the account management UI.
export const CAPABILITY_GROUPS: { label: string; caps: { id: Capability; label: string }[] }[] = [
  {
    label: "Stories",
    caps: [
      { id: "story.view", label: "View stories" },
      { id: "story.create", label: "Create stories" },
      { id: "story.edit", label: "Edit stories" },
      { id: "story.assign", label: "Assign people" },
      { id: "story.changeStatus", label: "Change status" },
      { id: "story.delete", label: "Delete / kill stories" },
    ],
  },
  {
    label: "Reporting",
    caps: [
      { id: "sources.manage", label: "Manage sources" },
      { id: "evidence.manage", label: "Manage evidence" },
      { id: "reportingLog.add", label: "Add to reporting log" },
      { id: "verification.manage", label: "Manage verification" },
    ],
  },
  {
    label: "Editorial and publishing",
    caps: [
      { id: "review.complete", label: "Complete review checklist" },
      { id: "review.approve", label: "Editor approve" },
      { id: "publish.toNews", label: "Publish to news.dot1.media" },
      { id: "publish.override", label: "Override incomplete review" },
      { id: "corrections.manage", label: "Manage corrections" },
    ],
  },
  {
    label: "Media",
    caps: [
      { id: "media.upload", label: "Upload media" },
      { id: "media.publish", label: "Publish media" },
    ],
  },
  {
    label: "Standards and broadcast",
    caps: [
      { id: "standards.edit", label: "Edit public standards" },
      { id: "broadcast.view", label: "View broadcasts" },
      { id: "broadcast.manage", label: "Manage broadcasts" },
      { id: "broadcast.golive", label: "Go live" },
    ],
  },
  {
    label: "Administration",
    caps: [
      { id: "admin.manageAccounts", label: "Manage accounts and roles" },
      { id: "admin.viewAudit", label: "View audit log" },
      { id: "admin.manageSettings", label: "Manage settings" },
    ],
  },
];
