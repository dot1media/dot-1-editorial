# Dot 1 News — Editorial Portal

The newsroom system behind **editorial.dot1.media**. This is where Dot 1 News defines what goes
out: stories are reported, sourced, verified, reviewed, scored with the D1-4LS model, and then
published into the news database that powers the news app and news.dot1.media.

It is real newsroom infrastructure, not pages describing one. Built to be useful with one person
today and to scale to reporters, editors, producers, anchors, and technical staff without redesign.

## Architecture

- **Next.js (App Router) on Vercel**, matching the rest of the suite.
- **Two databases, on purpose.** The editorial portal has its OWN Neon database (`DATABASE_URL`)
  holding every working record. Publishing writes into the SEPARATE news database
  (`NEWS_DATABASE_URL`), which owns the published `news_stories` rows the readers see. The two
  systems stay independent; editorial never depends on the news schema for its own work.
- **Suite single sign-on.** The signed `dot1_admin` cookie is set on `.dot1.media` with a shared
  `SESSION_SECRET`, identical to the portal and assets apps. One sign-in carries across all of them.
- **Permissions in two layers.** A role (Owner, Editor, Reporter, Producer, Viewer) sets sensible
  defaults; per-account overrides grant or revoke any single capability for one person. Owner is
  absolute. The first account to sign in bootstraps as Owner; everyone after starts as Viewer.

## The workflow, end to end

    TIP → STORY → SOURCES → VERIFICATION → EDITORIAL REVIEW → PUBLICATION → CORRECTION

Every potential story is a Story Record moving through the lifecycle (Tip Received → Assessment →
Assigned → Reporting → Verification → Script/Article → Editorial Review → Ready → Published →
Archived), with the non-linear flags Hold, Killed, Needs Follow-Up, Correction Required, Updated.

Each story carries a structured source manager, an evidence locker, a chronological reporting log
(timestamp and author captured automatically), individually tracked verification claims
(Confirmed / Unconfirmed / Disputed / False), the D1-4LS score, and the editorial review checklist.

The review ladder (Not Verified → Partially Verified → Verified → Editor Approved → Ready to
Publish) is computed from the actual claim states, the completed checklist, and a human approval.
**Publishing is gated:** a story only publishes when it is Ready to Publish, unless someone with
the override capability supplies a reason, which is written to the audit log. This is the
Handbook's human gate, enforced in software.

Corrections are never silent and never erased. Each is a permanent ledger row (what changed, why,
who authorized it, the original publish time); if the story is live, the correction re-syncs the
published news row.

## D1-4LS scoring

The scoring engine here mirrors the news app's canonical model exactly: four indices (BAI, PSI,
SCI, HII), five indicators each, every indicator 0-2, index totals derived from indicators, overall
0-40. On publish, the twenty indicators map onto the news `news_stories` columns and the four index
totals and legacy fields are derived from them, so a published story's numbers are always
internally consistent. Per the Handbook: the profile is shown over the total, the reasoning is
captured before the number, and the score informs the editor rather than deciding for them.

## Setup

1. **Environment** — see `.env.example`. Set `DATABASE_URL` (editorial's own Neon, pooled),
   `NEWS_DATABASE_URL` (the news Neon, pooled), and `SESSION_SECRET` (the SAME value as the rest of
   the suite).
2. **Database** — no manual migration step. The schema is created idempotently on first request
   (`lib/schema.ts`), so the first load provisions every table in the editorial database. The news
   database is expected to already have its `news_stories` table (owned by the news app).
3. **Deploy** — connect this repo to the Vercel project bound to `editorial.dot1.media`. Every push
   to `main` deploys.
4. **First sign-in** — sign in with a `@dot1.media` account (via suite SSO or password). The first
   account becomes Owner and can grant roles to everyone else from the Accounts page.

## Route map

| Path | Purpose |
|---|---|
| `/` | Newsroom dashboard: pipeline counts, workflow map, recent stories |
| `/stories`, `/stories/[id]` | Story list and the full story workspace (all tabs) |
| `/tips` | Public tip triage, promote-to-story |
| `/review` | Review queue |
| `/standards` | Editable public standards pages |
| `/accounts` | Roles and per-capability overrides |
| `/audit` | Append-only audit log |
| `/broadcast` | Phase two: rundown, teleprompter, graphics, live control |
| `/api/*` | Story workflow, publishing, accounts, tips, standards, audit |

## Still to come (phase two)

The Live Broadcast / Production system — broadcast records, the drag-and-drop rundown with runtime
math, teleprompter view, graphics manager, breaking-news mode, the technical checklist, and the
live dashboard — builds on this same foundation and connects directly to Story Records. The
newsroom workflow and the publishing pipeline came first, methodically, as planned.
