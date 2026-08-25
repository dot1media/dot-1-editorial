#!/usr/bin/env python3
"""Owner/maintainer + hiring documents. NOT hosted publicly — generated to ops-docs/ (gitignored)
and delivered as files. Run: python3 scripts/build_ops.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_packets import (Packet, sty, cover, H1, H2, P, KICK, NOTE, B, N, SP, box,
                           HexColor, TA_CENTER, Paragraph, Table, TableStyle, ParagraphStyle,
                           DEEP, GOLD, PAPER, HAIR, INK, MUTED, W)

OUT = os.path.join(os.path.dirname(__file__), "..", "ops-docs")
os.makedirs(OUT, exist_ok=True)

def simple_cover(title, sub):
    return cover(title, sub)

def kv_table(rows, col1="Item", col2="Detail", widths=(150, 335)):
    head = [Paragraph(col1, ParagraphStyle("th", parent=sty["body"], fontName="Helvetica-Bold", fontSize=8, textColor=HexColor("#ffffff"))),
            Paragraph(col2, ParagraphStyle("th2", parent=sty["body"], fontName="Helvetica-Bold", fontSize=8, textColor=HexColor("#ffffff")))]
    data = [head]
    for a, b in rows:
        data.append([Paragraph(a, ParagraphStyle("c1", parent=sty["body"], fontSize=8.4, fontName="Helvetica-Bold", textColor=DEEP)),
                     Paragraph(b, ParagraphStyle("c2", parent=sty["body"], fontSize=8.4))])
    t = Table(data, colWidths=list(widths), repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), DEEP), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), PAPER]),
        ("GRID", (0, 0), (-1, -1), 0.5, HAIR), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t

# ============================ HANDOFF GUIDE ============================
def build_handoff():
    s = simple_cover("All-Systems Handoff Guide", "How to run and maintain everything — for a future maintainer")
    s += [KICK("READ FIRST"), H1("What this is")]
    s += [P("This is the continuity guide: how every Dot One Media system is built, hosted, deployed, and fixed, so someone other than the founder could keep it all running. It's written for a capable maintainer (a developer, or a family caretaker) — the goal is caretaking, not rebuilding.")]
    s += [box([NOTE("This document contains NO passwords or keys. Those live in the separate <b>secrets inventory</b>. Keep both documents private.")])]
    s += [H2("The shape of everything")]
    s += [B("<b>Code</b> lives in GitHub (organization <b>dot1media</b>): dot-1-editorial, dot-1-news, dot-1-portal, dot-1-assets, dot-1-site."),
          B("<b>Websites</b> are hosted on <b>Vercel</b> — each repo is a Vercel project that <b>auto-deploys when you push to <font face='Courier'>main</font></b>."),
          B("<b>Databases</b> are <b>Neon</b> Postgres — one per app (editorial, news, portal, assets)."),
          B("<b>Video</b> (live + recorded) is <b>Cloudflare Stream</b>; <b>photo galleries</b> are <b>CloudSpot</b>; <b>email</b> is <b>Resend</b>; <b>client payments</b> are <b>Square</b>."),
          B("<b>The app</b> (Dot 1 News, App Store) is built with Expo/EAS; native builds go through the ship flow, small changes ship over-the-air.")]
    s += [H2("System by system")]
    s += [P("<b>Editorial — the newsroom</b> (dot-1-editorial → editorial.dot1.media). Next.js on Vercel with its own Neon database; it also reads the news database to publish. Runs the AI pipeline and the broadcast graphics/live control. Broadcast overlays are static files in <font face='Courier'>public/broadcast</font>. Deploy by pushing to main. Config you'll see: the two database URLs, the Cloudflare Stream settings (account id, stream token, customer-code), a cron secret, and the AI generation key.")]
    s += [P("<b>News — reader app + site</b> (dot-1-news → news.dot1.media + the App Store app). An Expo/React-Native app plus a Hono/tRPC backend; the website is served by the backend. The <b>website</b> deploys by pushing to main (Vercel). The <b>app</b> is built with EAS through the ship script and updated over-the-air with <font face='Courier'>eas update</font>. Admin uses two-factor. Config: its database URL, an admin API key, and the editorial base URL it reads policy from.")]
    s += [P("<b>Client portal</b> (dot-1-portal → portal.dot1.media). Next.js on Vercel with its own Neon database; Square payments, Resend email, PDF receipts/invoices. It is also the <b>identity hub</b> for staff sign-in. Deploy by pushing to main. Config: database URL, the session secret, Square keys + webhook signing key, the email sender, the Google review link, and the assets database URL (for gear-package dropdowns).")]
    s += [P("<b>Asset system</b> (dot-1-assets → assets.dot1.media). Next.js on Vercel with its own Neon database. It trusts the portal's sign-in (shared cookie), so its session secret must match the portal's. Deploy by pushing to main. Config: database URL, the session secret (same value as the portal), and an optional setup code.")]
    s += [P("<b>Company website</b> (dot-1-site → dot1.media). Static HTML on Vercel; no database, no login. It also <b>hosts the agreement PDFs</b> (Client Services Agreement, Release & Waiver, Minor Release). Deploy by pushing to main.")]
    s += [H2("Everyday tasks")]
    s += [B("<b>Deploy</b>: commit and push to <font face='Courier'>main</font>; Vercel builds and deploys automatically."),
          B("<b>Roll back</b>: in the Vercel dashboard, open the project's Deployments and promote a previous good deployment."),
          B("<b>Logs</b>: the Vercel dashboard (Functions/Logs) for each project."),
          B("<b>Run locally</b>: <font face='Courier'>npm install</font> then <font face='Courier'>npm run dev</font> (the app uses the ship script for native builds)."),
          B("<b>The app</b>: JavaScript/content changes can go out with <font face='Courier'>eas update</font>; anything native (splash, icon, permissions, push) needs a new build; bump the version if the current one is live on the store.")]
    s += [H2("Golden rules & gotchas")]
    s += [B("<b>Portal cache</b>: bump the service-worker cache name in <font face='Courier'>public/sw.js</font> every portal deploy, or clients see stale pages."),
          B("<b>Portal payments table</b>: the app owns it (it rebuilds it on demand). Never run an old SQL migration against it — that caused past breakage."),
          B("<b>Agreement PDFs</b> live in the <b>site</b> repo, not the portal — edit them there."),
          B("<b>Single sign-on</b>: the portal and asset system share the same session secret; keep them identical or staff can't cross between them. The newsroom and app logins are intentionally separate."),
          B("<b>Email</b>: the dot1.media domain must stay verified in Resend (SPF/DKIM/DMARC) or messages silently fail, especially to Gmail/Outlook/military inboxes."),
          B("<b>Square webhook</b>: must be configured in the Square dashboard for automatic payment sync; the redirect/Check paths work regardless."),
          B("<b>Cloudflare Stream</b>: the customer-code is the code only, not the full hostname."),
          B("<b>Database driver</b>: connections are lazy (they fail at query time, not import) and there's no generic query() — that's intentional; don't 'fix' it."),
          B("<b>Commit author</b>: commit as the studio identity (contact@dot1.media), not a personal address — the hosting has rejected builds from the wrong author before."),
          B("<b>Brand tokens</b> are duplicated across the portal and assets (edit once, copy to the other)."),
          B("<b>Workflow files</b> (.github/workflows) can't be pushed by the deploy token — edit those in the GitHub web interface.")]
    s += [H2("If you're truly stuck")]
    s += [P("Each system also has its own in-app guide, and the Employee Handbook explains what each does from the user's side. Start there, then check the Vercel logs for the failing project. Most incidents are a stale cache (hard-refresh twice), a missing/rotated key (secrets inventory), or an unverified email domain.")]
    d = Packet(os.path.join(OUT, "Dot1Media-Handoff-Guide.pdf"), "HANDOFF GUIDE")
    d.title = "Dot One Media — All-Systems Handoff Guide"; d.build(s)

# ============================ BACKUP RUNBOOK ============================
def build_backup():
    s = simple_cover("Backup & Recovery Runbook", "Protecting the data everything depends on")
    s += [KICK("WHY THIS MATTERS"), H1("What must be protected")]
    s += [P("Almost everything the company runs on is in databases. If one is lost or corrupted with no backup, the work in it is gone. This runbook covers what to back up, how, and how to restore.")]
    s += [kv_table([
        ("Neon databases (4)", "editorial, news, portal, assets — the crown jewels. Back these up (below)."),
        ("Code (GitHub)", "Already version-controlled and hosted; low risk. Optionally keep a periodic local clone."),
        ("Secrets", "Kept in the separate secrets inventory — back that up securely too."),
        ("Video (Cloudflare Stream)", "Managed by Cloudflare; keep master files for important episodes off-platform."),
        ("Photos (CloudSpot)", "Managed by CloudSpot; the studio keeps its own master files as usual."),
    ], "What", "How it's protected", (150, 335))]
    s += [H2("Neon databases — the important part")]
    s += [B("<b>Turn on / verify point-in-time recovery</b> for each Neon project (History/retention). This lets you restore to a moment before a bad change."),
          B("<b>Take periodic exports</b> so you have a copy that doesn't depend on Neon at all. Store them somewhere safe and private (encrypted cloud storage), never in a code repo."),
          B("<b>Test a restore</b> occasionally — a backup you've never restored is a hope, not a backup.")]
    s += [H2("The commands")]
    s += [P("Use each database's <b>direct (unpooled)</b> connection string. Export a compressed dump:")]
    s += [box([Paragraph('pg_dump "$CONN" -Fc -f portal_2026-01-15.dump', ParagraphStyle("code", parent=sty["body"], fontName="Courier", fontSize=8.5))], bg=HexColor("#f3efe6"))]
    s += [P("Restore that dump into a database (a fresh Neon branch is safest to test against):")]
    s += [box([Paragraph('pg_restore --clean --if-exists --no-owner -d "$CONN" portal_2026-01-15.dump', ParagraphStyle("code2", parent=sty["body"], fontName="Courier", fontSize=8.5))], bg=HexColor("#f3efe6"))]
    s += [P("Or restore to a point in time directly in the Neon console (create a branch at a timestamp, verify it, then promote). For a plain-SQL copy instead of compressed: <font face='Courier'>pg_dump \"$CONN\" &gt; db.sql</font> and <font face='Courier'>psql \"$CONN\" &lt; db.sql</font>.")]
    s += [H2("A simple cadence")]
    s += [N(1, "<b>Now</b>: confirm point-in-time recovery is on for all four Neon projects."),
          N(2, "<b>Monthly</b>: run a <font face='Courier'>pg_dump</font> of each database; store the four dumps in secure, dated folders; keep the last several months."),
          N(3, "<b>Quarterly</b>: restore one dump into a throwaway Neon branch and confirm it opens and looks right."),
          N(4, "<b>After any big change</b> (a migration, a bulk import): take an extra dump first.")]
    s += [box([NOTE("The portal's payments table is rebuilt by the app; a plain dump/restore is fine. Do not restore an old hand-written payments migration — let the app own that table.")])]
    d = Packet(os.path.join(OUT, "Dot1Media-Backup-Runbook.pdf"), "BACKUP RUNBOOK")
    d.title = "Dot One Media — Backup & Recovery Runbook"; d.build(s)

# ============================ RENEWALS CALENDAR ============================
def build_renewals():
    s = simple_cover("Renewals & Deadlines", "The dates that quietly break things if missed")
    s += [KICK("KEEP THESE ALIVE"), H1("What to never let lapse")]
    s += [P("These are the recurring renewals that, if missed, take something down. Put each one — with its exact date — into a real calendar with reminders a month ahead. Fill the <b>Next due</b> column as you confirm each date.")]
    s += [H2("Critical — missing these takes systems down")]
    s += [kv_table([
        ("Apple Developer Program", "Yearly (~$99). If it lapses, the Dot 1 News app is removed from the App Store. Renew at developer.apple.com. Next due: ____"),
        ("Domain registrations", "Yearly (or multi-year). If a domain lapses, that site goes dark. Renew at your registrar. Next due: ____"),
        ("Google Workspace / @dot1.media", "Monthly or yearly. Staff email AND the staff logins depend on the domain/email — losing it breaks sign-in across the suite. Next due: ____"),
        ("SAM.gov registration", "Yearly. If it lapses you can't be awarded or keep federal contracts. Renew at sam.gov. Next due: ____"),
    ], "Item", "Cadence / consequence / where", (140, 345))]
    s += [H2("Important — business standing & certifications")]
    s += [kv_table([
        ("Alaska business filings", "The LLC's periodic report / business license to stay in good standing (AK Div. of Corporations). Next due: ____"),
        ("FAA Part 107", "Once certified, recurrent training every 24 months to keep flying commercially. Next due: ____"),
        ("Business insurance", "Annually — liability and equipment coverage. Confirm renewal with your carrier. Next due: ____"),
    ], "Item", "Cadence / consequence", (140, 345))]
    s += [H2("Billing — usually auto, but watch for failures")]
    s += [kv_table([
        ("Vercel / Neon / Cloudflare", "Hosting, databases, video. Usually card-on-file monthly; a failed payment can disrupt service — keep the card current."),
        ("Resend / Square", "Email and payments. Keep billing current; watch for Square account reviews."),
    ], "Item", "Note", (140, 345))]
    s += [SP(6), box([NOTE("The four most catastrophic if missed: Apple (app pulled), domains (sites dark), Google Workspace/domain (email + logins), and SAM.gov (federal work). Set 30-day-ahead reminders for those first.")])]
    d = Packet(os.path.join(OUT, "Dot1Media-Renewals-Calendar.pdf"), "RENEWALS")
    d.title = "Dot One Media — Renewals & Deadlines"; d.build(s)

# ============================ HIRING GUIDE ============================
def build_hiring():
    s = simple_cover("Hiring Guide", "Building the team the system is ready for")
    s += [KICK("THE SITUATION"), H1("You're ready to staff")]
    s += [P("The tooling is built and documented; the bottleneck now is people. The systems are designed to be delegated into safely — access is by role, editors sign off before anything publishes, and every action is logged — so you can hand pieces of the work to others without losing editorial control. Your two irreplaceable roles are the journalism (writing and approving) and being on camera; almost everything else is delegable.")]
    s += [H2("Who to hire first")]
    s += [B("<b>A reporter (one, then two)</b> — so you're approving and editing rather than writing everything from scratch."),
          B("<b>A producer / broadcast lead</b> — so the show and episodes run without you doing both anchor and control."),
          B("<b>A studio associate / second shooter</b> — to help the Creative Director on photo/video volume."),
          B("<b>Later: social &amp; audience</b> — to work the notifications and analytics once people are coming in.")]
    s += [box([NOTE("Whether these are employees or contractors, and how they're paid, are decisions for an accountant/attorney — especially with government work in the mix. Treat the descriptions below as drafts to adapt, not legal templates.")])]
    s += [H2("Role: Reporter (Dot 1 News)")]
    s += [B("<b>Does</b>: researches and writes stories; builds the record (sources, evidence, a reporting log); works verification; adds a rating."),
          B("<b>Doesn't</b>: publish — an editor approves and publishes."),
          B("<b>Works in</b>: the editorial portal, Reporter role."),
          B("<b>Looking for</b>: sound news judgment, careful sourcing, clear writing, comfort with a documented, dual-checked process. Our standard is Just Truth, No Bias.")]
    s += [H2("Role: Producer / Broadcast")]
    s += [B("<b>Does</b>: runs cameras, the ATEM, and OBS; drives on-air graphics from the portal; publishes recorded episodes; runs live broadcasts."),
          B("<b>Works in</b>: the editorial portal (broadcast permission) + the studio gear."),
          B("<b>Looking for</b>: live-production calm, basic video/audio literacy, willingness to follow the run-of-show and dry-run checklist.")]
    s += [H2("Role: Studio Associate / Photographer")]
    s += [B("<b>Does</b>: shoots and assists on client photo/video; manages sessions in the client portal; checks gear out and in; helps with delivery."),
          B("<b>Works in</b>: the client portal + the asset system (studio login)."),
          B("<b>Looking for</b>: craft, client-facing professionalism, organization with gear and deliverables.")]
    s += [H2("Role: Editor (as you grow)")]
    s += [B("<b>Does</b>: reviews and approves stories, publishes, manages corrections and standards; can also send alerts."),
          B("<b>Works in</b>: the editorial portal, Editor role. Reserve Owner for yourself.")]
    s += [H2("New-hire access checklist")]
    s += [B("<b>Newsroom hire</b>: create an editorial account, set the role (Reporter/Producer/Editor). No Owner. No studio/portal access unless they also do client work."),
          B("<b>Studio hire</b>: create a studio @dot1.media login (works for portal + assets). Don't give newsroom access unless needed."),
          B("<b>Everyone</b>: hand them the Day One checklist + their role packet; confirm they can see only what their role should; never share logins."),
          B("<b>When someone leaves</b>: remove their editorial account/role, disable their studio login, and rotate any shared secret they touched.")]
    s += [H2("Your veteran-owned edge")]
    s += [P("Dot One Media is a veteran-owned business with active SAM.gov registration. As you hire, that status and the government/commercial capability are real differentiators for the leveraged-services and federal path — worth naming in outreach and worth protecting (keep SAM.gov and certifications current, per the renewals sheet).")]
    d = Packet(os.path.join(OUT, "Dot1Media-Hiring-Guide.pdf"), "HIRING GUIDE")
    d.title = "Dot One Media — Hiring Guide"; d.build(s)

def build():
    build_handoff(); build_backup(); build_renewals(); build_hiring()
    print("Ops docs built:", os.listdir(OUT))

if __name__ == "__main__":
    build()
