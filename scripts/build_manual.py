#!/usr/bin/env python3
"""Build the Dot 1 News Operations Manual — the full training manual for staff.
Regenerated with the other handouts. Output: public/docs/Dot1News-Operations-Manual.pdf
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                PageBreak, Table, TableStyle, NextPageTemplate)
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus.tableofcontents import TableOfContents

CRIMSON = HexColor("#b81616"); DEEP = HexColor("#8f1111"); GOLD = HexColor("#c8a24a")
INK = HexColor("#141210"); MUTED = HexColor("#6b6459"); PAPER = HexColor("#faf7f1")
HAIR = HexColor("#e0d8c8"); BLUE = HexColor("#3a6ea5"); GREEN = HexColor("#2f8f6b")

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "docs")
os.makedirs(OUT, exist_ok=True)
PATH = os.path.join(OUT, "Dot1Media-Employee-Handbook.pdf")

# ---------------- styles ----------------
def S():
    body = ParagraphStyle("body", fontName="Helvetica", fontSize=9.7, leading=14.5, textColor=INK, spaceAfter=7)
    return {
        "body": body,
        "h1": ParagraphStyle("h1", fontName="Times-Bold", fontSize=19, leading=23, textColor=DEEP, spaceBefore=8, spaceAfter=10),
        "h2": ParagraphStyle("h2", fontName="Times-Bold", fontSize=14, leading=18, textColor=INK, spaceBefore=14, spaceAfter=6),
        "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=DEEP, spaceBefore=10, spaceAfter=4),
        "kick": ParagraphStyle("kick", fontName="Courier", fontSize=8, leading=11, textColor=CRIMSON, spaceAfter=3),
        "bullet": ParagraphStyle("bullet", parent=body, leftIndent=16, bulletIndent=4, spaceAfter=3),
        "num": ParagraphStyle("num", parent=body, leftIndent=18, spaceAfter=4),
        "note": ParagraphStyle("note", parent=body, fontSize=9, textColor=DEEP, leftIndent=10, spaceBefore=3),
        "cover_t": ParagraphStyle("cover_t", fontName="Times-Bold", fontSize=34, leading=38, textColor=HexColor("#f4f0e7"), alignment=TA_CENTER),
        "cover_s": ParagraphStyle("cover_s", fontName="Helvetica", fontSize=13, leading=18, textColor=GOLD, alignment=TA_CENTER),
        "cover_m": ParagraphStyle("cover_m", fontName="Courier", fontSize=9, leading=13, textColor=HexColor("#cfc8ba"), alignment=TA_CENTER),
        "toc1": ParagraphStyle("toc1", fontName="Helvetica-Bold", fontSize=10.5, leading=18, textColor=INK),
        "toc2": ParagraphStyle("toc2", fontName="Helvetica", fontSize=9.5, leading=15, textColor=MUTED, leftIndent=16),
        "tblh": ParagraphStyle("tblh", fontName="Helvetica-Bold", fontSize=7.6, leading=9, textColor=HexColor("#ffffff"), alignment=TA_CENTER),
        "tbl": ParagraphStyle("tbl", fontName="Helvetica", fontSize=7.8, leading=9.5, textColor=INK),
        "tblc": ParagraphStyle("tblc", fontName="Helvetica-Bold", fontSize=8.5, leading=10, textColor=DEEP, alignment=TA_CENTER),
    }
st = S()

class Manual(BaseDocTemplate):
    def __init__(self, path, **kw):
        super().__init__(path, pagesize=letter, leftMargin=64, rightMargin=64, topMargin=74, bottomMargin=58, **kw)
        self.title = "Dot One Media — Employee Handbook"
        cover = PageTemplate(id="cover", frames=[Frame(0, 0, letter[0], letter[1], id="c")], onPage=self._cover_bg)
        normal = PageTemplate(id="normal", frames=[Frame(self.leftMargin, self.bottomMargin,
                    self.width, self.height, id="n")], onPage=self._chrome)
        self.addPageTemplates([cover, normal])
        self._toc_counter = 0

    def beforeDocument(self):
        self._toc_counter = 0

    def _cover_bg(self, c, d):
        c.setFillColor(INK); c.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
        c.setFillColor(CRIMSON); c.rect(0, letter[1] - 250, letter[0], 5, fill=1, stroke=0)
        c.setFillColor(CRIMSON); c.rect(0, 232, letter[0], 5, fill=1, stroke=0)

    def _chrome(self, c, d):
        c.setFillColor(INK); c.setFont("Times-Bold", 9); c.drawString(64, letter[1] - 46, "DOT ONE MEDIA")
        c.setFillColor(MUTED); c.setFont("Courier", 7)
        c.drawRightString(letter[0] - 64, letter[1] - 46, "EMPLOYEE HANDBOOK")
        c.setStrokeColor(HAIR); c.setLineWidth(0.6); c.line(64, letter[1] - 54, letter[0] - 64, letter[1] - 54)
        c.setStrokeColor(HAIR); c.line(64, 48, letter[0] - 64, 48)
        c.setFillColor(MUTED); c.setFont("Courier", 7)
        c.drawString(64, 38, "A Declared Standpoint")
        c.drawRightString(letter[0] - 64, 38, "Page %d" % d.page)

    def afterFlowable(self, flowable):
        if not hasattr(flowable, "style"):
            return
        name = flowable.style.name
        if name in ("h1", "h2"):
            text = flowable.getPlainText()
            level = 0 if name == "h1" else 1
            key = "toc%d" % self._toc_counter; self._toc_counter += 1
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=level, closed=(level == 0))
            self.notify("TOCEntry", (level, text, self.page, key))

def H1(txt): 
    p = Paragraph(txt, st["h1"]); return p
def H2(txt): return Paragraph(txt, st["h2"])
def H3(txt): return Paragraph(txt, st["h3"])
def P(txt): return Paragraph(txt, st["body"])
def KICK(txt): return Paragraph(txt, st["kick"])
def NOTE(txt): return Paragraph("<b>Note:</b> " + txt, st["note"])
def B(txt): return Paragraph(txt, st["bullet"], bulletText="•")
def N(i, txt): return Paragraph(f"<b>{i}.</b>&nbsp;&nbsp;" + txt, st["num"])
def SP(h=6): return Spacer(1, h)

def box(flowables, bg=PAPER, stroke=HAIR):
    t = Table([[flowables]], colWidths=[letter[0] - 128 - 20])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.8, stroke),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
    return t

story = []

# ---------------- cover ----------------
story += [Spacer(1, 240),
          Paragraph("DOT ONE MEDIA", st["cover_t"]),
          Spacer(1, 10),
          Paragraph("Employee Handbook", ParagraphStyle("ct2", parent=st["cover_t"], fontSize=22, textColor=GOLD)),
          Spacer(1, 18),
          Paragraph("How we run the studio, the client portal, the<br/>asset system, the websites, and the newsroom", st["cover_s"]),
          Spacer(1, 120),
          Paragraph("A DECLARED STANDPOINT", st["cover_m"]),
          Paragraph("Veteran-owned · Wasilla, Alaska", st["cover_m"]),
          Spacer(1, 8),
          Paragraph("Confidential · for Dot One Media staff", st["cover_m"]),
          NextPageTemplate("normal"), PageBreak()]

# ---------------- table of contents ----------------
toc = TableOfContents()
toc.levelStyles = [st["toc1"], st["toc2"]]
story += [KICK("CONTENTS"), Paragraph("What's in this handbook", ParagraphStyle("tochead", parent=st["h1"])), SP(6), toc, PageBreak()]

# ===== 1. WELCOME =====
story += [KICK("SECTION 1"), H1("Welcome to Dot One Media")]
story += [P("This handbook is how we run everything. It covers every system we use — the company website, the client portal, the asset system, and the entire Dot 1 News newsroom and broadcast — plus the day-to-day procedures and the permissions that decide who does what. If you're new, read it once front to back, then use the contents and the runbooks in Section 14 as your daily reference. Several systems also have their own in-app guides; this handbook is the master that ties them together.")]
story += [P("Our posture is <b>A Declared Standpoint</b>: we're open about who we are and we do the work to a documented standard. For the newsroom that standard is <b>Just Truth, No Bias</b>. The tools in this handbook exist to make that standard repeatable.")]
story += [box([NOTE("If a page or button described here isn't visible to you, it's gated to a role you don't have. That's expected — ask an Owner or the studio.")])]

# ===== 2. THE COMPANY =====
story += [PageBreak(), KICK("SECTION 2"), H1("The company & its work")]
story += [P("Dot One Media (DOT ONE LLC, established 2021) is a veteran-owned, faith-driven media and production studio based in the Wasilla–Palmer area of Alaska. It was founded by Dennis Matthews Jr.; Brittany Matthews serves as Creative Director and Photojournalist.")]
story += [H3("What we do")]
story += [B("<b>Photography</b> — led by the Creative Director; our current growth area."),
          B("<b>Video &amp; film</b> — from short pieces to documentary and commercial work."),
          B("<b>Music</b> — production and related services."),
          B("<b>Government &amp; commercial</b> — we are SAM.gov registered (UEI R3MTPRVZ9L42, CAGE 22YZ5); FAA Part 107 remote-pilot certification is in progress."),
          B("<b>Dot 1 News</b> — our independent news outlet: a newsroom, a reader app and website, and a broadcast studio.")]
story += [P("Client work (photo, video, music, government) is run through the <b>client portal</b>. The newsroom and broadcast run through the <b>Dot 1 News</b> systems. The <b>asset system</b> tracks the gear all of it depends on.")]

# ===== 3. ECOSYSTEM =====
story += [PageBreak(), KICK("SECTION 3"), H1("The whole ecosystem at a glance")]
story += [P("Everything we run has an address. Client-facing systems are public; staff systems require a login.")]
sysrows = [
    [Paragraph("System", st["tblh"]), Paragraph("Address", st["tblh"]), Paragraph("Who uses it / what it's for", st["tblh"])],
    [Paragraph("Company website", st["tbl"]), Paragraph("dot1.media", st["tbl"]), Paragraph("Public. Marketing, services, government capabilities, agreements, news-tip button.", st["tbl"])],
    [Paragraph("Client portal", st["tbl"]), Paragraph("portal.dot1.media", st["tbl"]), Paragraph("Clients + studio. Booking, payments, the session status timeline, delivery.", st["tbl"])],
    [Paragraph("Asset system", st["tbl"]), Paragraph("assets.dot1.media", st["tbl"]), Paragraph("Studio. Equipment/software/service inventory, lifecycle, gear packages, check-out.", st["tbl"])],
    [Paragraph("Editorial portal", st["tbl"]), Paragraph("editorial.dot1.media", st["tbl"]), Paragraph("Newsroom staff. Write, verify, score, publish; run broadcast and live.", st["tbl"])],
    [Paragraph("News website", st["tbl"]), Paragraph("news.dot1.media", st["tbl"]), Paragraph("Public. Stories, live page, standpoint pages, news-tip form.", st["tbl"])],
    [Paragraph("Reader app", st["tbl"]), Paragraph("Dot 1 News (App Store)", st["tbl"]), Paragraph("Public iOS/Android app. Reading, live banner, videos, notifications.", st["tbl"])],
    [Paragraph("Broadcast overlays", st["tbl"]), Paragraph("editorial.dot1.media/broadcast/…", st["tbl"]), Paragraph("The on-air graphics OBS loads (16:9 and 9:16).", st["tbl"])],
]
t = Table(sysrows, colWidths=[92, 140, 248])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), DEEP), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), PAPER]),
    ("GRID", (0, 0), (-1, -1), 0.5, HAIR), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
story += [t]

# ===== 4. SIGNING IN & ACCESS =====
story += [PageBreak(), KICK("SECTION 4"), H1("Signing in & access")]
story += [P("There are three separate sign-in worlds, on purpose:")]
story += [H3("Studio staff — one login for portal + assets")]
story += [P("Studio staff sign in with a single <b>@dot1.media</b> account at <b>portal.dot1.media</b>. That one sign-in also carries you into the asset system at assets.dot1.media automatically — the portal is the identity hub, and the two share a sign-in. Signing out of one signs you out of both. Studio admin accounts are managed in the portal under <b>Admins</b>; if no admin exists yet, a first-run setup appears, and a studio master password can reset a locked-out admin.")]
story += [H3("Newsroom — its own login")]
story += [P("The editorial portal (and the reader app's admin) have their <b>own</b> login, kept separate from the studio sign-in by design — the news app adds two-factor for hardening. Newsroom access is governed by the roles in Section 10.")]
story += [H3("Clients — their own accounts")]
story += [P("Clients create their own portal account when they book. That's entirely separate from staff logins. Clients only ever see their own sessions.")]
story += [box([NOTE("Treat every login as a credential. Don't share it; actions are recorded. Never enter a password or payment detail into an automated tool — a person does those directly.")])]

# ===== 5. COMPANY WEBSITE =====
story += [PageBreak(), KICK("SECTION 5"), H1("The company website (dot1.media)")]
story += [P("dot1.media is our public front door — a marketing site, not something staff log into. Know what's on it so you can point people to the right place.")]
story += [B("<b>Services</b> — photography, video, music, and government &amp; commercial work."),
          B("<b>Methodology</b> — how we approach the work, including our editorial methodology."),
          B("<b>Government &amp; commercial</b> — our SAM.gov registration (UEI R3MTPRVZ9L42, CAGE 22YZ5) and certifications."),
          B("<b>Dot 1 News</b> — a section introducing the news outlet."),
          B("<b>Agreements</b> — the Client Services Agreement, Release &amp; Waiver, and Minor Release PDFs are hosted here."),
          B("<b>Submit a news tip</b> — a button that feeds the newsroom's tips queue."),
          B("Footer links to both Instagram handles (@dot1media, @dot1photo) and the Dot 1 News app.")]
story += [NOTE("Booking a client session is moving into the client portal; where the site still points to older scheduling, prefer the portal. Photography is shown as a single collage grid by the Creative Director's choice.")]

# ===== 6. CLIENT PORTAL — STUDIO =====
story += [PageBreak(), KICK("SECTION 6"), H1("The client portal — studio side")]
story += [P("portal.dot1.media is where the studio runs every client job. It's a live web app (booking, payments, receipts, delivery, and analytics) and it has its own in-app <b>Studio Admin Guide</b> for detail. This section is the overview.")]

story += [H2("6.1 The session status timeline")]
story += [P("Every job is a <b>session</b> that moves through a status timeline the client can watch:")]
story += [N(1, "Scheduling the session"), N(2, "Session / shoot booked"), N(3, "Day-of"),
          N(4, "Post-shoot"), N(5, "Editing"), N(6, "Pre-delivery (client can suggest edits)"), N(7, "Final delivery")]
story += [P("Advance a session as it progresses. When you advance a stage you can choose whether to email the client about it (on by default). Consultations use a shorter three-stage track.")]

story += [H2("6.2 Getting a job into the system")]
story += [B("<b>Client self-booking</b> — the client picks a service, date, add-ons, signs the agreements, pays the retainer, and creates their account, all in the booking flow."),
          B("<b>Internal booking</b> — a studio-only quick booking (used for high-volume mini sessions). It emails the client the agreement and details and, if set, a payment request; no portal account is created and it's hidden from the client portal."),
          B("<b>Invoice</b> — send a client a bill that doubles as a booking (see 6.4)."),
          B("<b>Import</b> — past sessions can be imported from an Acuity CSV export under Business Settings.")]

story += [H2("6.3 Services, payments & receipts")]
story += [B("<b>Services &amp; add-ons</b> — session types are organized by group (Photography, Video, Music, Government). Each can carry an example image and an attached gear package (Section 9)."),
          B("<b>Payments</b> run through Square. Video takes a 50% retainer; photography is paid in full or half; music and government are quote-based. Deposits and balances are tracked per session."),
          B("<b>Receipts</b> are generated as branded PDFs and emailed; partial payments show the total and balance remaining."),
          B("The studio home surfaces a <b>Pending payment</b> panel of everything owed. If a payment doesn't show, the Check / Sync buttons re-query Square.")]

story += [H2("6.4 Invoices")]
story += [P("From Sessions, create an invoice: enter the client and details, pick the service and add-ons (with quantities) or custom line items, preview it, and send. The client receives a branded invoice PDF and a payment link for the 50% retainer. Paying it books the session, and the client then signs the agreements and sets a password before reaching their dashboard. Sent invoices are saved in an archive where you can re-download the PDF, resend, copy the payment link, or create a link if one is missing.")]

story += [H2("6.5 Delivering the work")]
story += [B("<b>Photos</b> — delivered via a gallery link (the studio uses CloudSpot); paste the gallery URL into the session's delivery field."),
          B("<b>Video</b> — paste the final video link (typically a Frame.io URL)."),
          B("<b>Music / government</b> — deliverables links with matching wording."),
          B("Saving a delivery link never emails silently — a confirmation asks you to verify the link points to the final files before the client is emailed."),
          B("When a session reaches final delivery, the client is sent a warm review request with the Google review link; there's also a manual Request a review button.")]

story += [H2("6.6 Messaging, accounts & analytics")]
story += [B("<b>Messages</b> — a two-way thread with the client, images supported both ways, with a notification bell for new activity."),
          B("<b>Client Accounts</b> — look a client up by email to reset their password or change their login email."),
          B("<b>Analytics</b> (Business Settings) — revenue by service line, bookings by session type, and by month, plus a colored mini-calendar of the schedule.")]
story += [NOTE("Photography routes to the Creative Director; video, music, and government route to the founder. Changing a session's type re-routes it accordingly.")]

# ===== 7. CLIENT PORTAL — CLIENT =====
story += [PageBreak(), KICK("SECTION 7"), H1("The client portal — client side")]
story += [P("This is what your clients experience, so you can guide them. It has its own in-app <b>Client Guide</b> too.")]
story += [B("<b>Book</b> — choose a service group and type, a date and time, and any add-ons; sign the Client Services Agreement and release waiver; pay the retainer; and create an account, all in one flow."),
          B("<b>Track</b> — sign back in any time to see the status timeline of their session, and receive status emails as it advances."),
          B("<b>Pay</b> — the retainer and any balance through Square, with receipts emailed."),
          B("<b>Message</b> — talk to the studio directly, with images."),
          B("<b>Receive</b> — the finished work through the gallery or video link the studio sends."),
          B("<b>Review</b> — a prompt to leave a Google review after final delivery."),
          B("<b>Comfort</b> — appearance themes (including a Midnight dark mode), and Terms of Service and Privacy pages.")]
story += [NOTE("Clients only see their own sessions. Internal and imported sessions are hidden from the client side.")]

# ===== 8. ASSET SYSTEM =====
story += [PageBreak(), KICK("SECTION 8"), H1("The asset management system (assets.dot1.media)")]
story += [P("The asset system tracks all of Dot One Media's equipment, software licenses, and web services, and tells us when things need replacing or renewing. Sign in with your studio @dot1.media login (the same one as the portal). It's built to hold more than one business over time; Dot One Media is the first, chosen from the business switcher in the top bar.")]
story += [H3("The tabs")]
story += [B("<b>Dashboard</b> — total inventory value, counts, category and condition breakdowns, and a lifecycle attention list."),
          B("<b>Inventory</b> — a searchable, filterable table of every item (by equipment / software / service, category, status, or text). Add, edit, or delete items here; an item shows how many are currently checked out."),
          B("<b>Lifecycle</b> — items grouped by urgency: overdue, due soon, on track, or needs dates. Equipment replacement is figured from its purchase date plus expected lifespan; software and services from their renewal date. These fields start empty — fill them in over time and the lifecycle view and dashboard alerts populate."),
          B("<b>Packages</b> — reusable gear kits built from inventory (Section 9)."),
          B("<b>Checked Out</b> — what gear is out on a shoot, when it's due back, and overdue flags (Section 9).")]
story += [NOTE("The system was seeded with the studio's full inventory (about 147 items). Keep it current: add new gear when it arrives, and fill in purchase and renewal dates so the lifecycle alerts are meaningful.")]

# ===== 9. GEAR PACKAGES =====
story += [PageBreak(), KICK("SECTION 9"), H1("Gear packages (assets + portal, together)")]
story += [P("A <b>package</b> is a named kit of gear — the equipment a particular kind of shoot needs. Packages tie the asset system and the client portal together so you can plan and track gear per session type.")]
story += [H3("How the loop works")]
story += [N(1, "<b>Build the package</b> in the asset system's Packages tab: name it and pick items from inventory with quantities."),
          N(2, "<b>Attach it to a session type</b> in the portal (Services &amp; Add-ons) so everyone knows what gear that kind of job needs."),
          N(3, "<b>Check it out</b> in the asset system's Checked Out tab when you take the gear for a shoot — set a due-back date."),
          N(4, "<b>Check it in</b> when the gear returns. Inventory shows what's currently out, and overdue kits are flagged.")]
story += [NOTE("This gives you a live picture of where gear is, prevents double-booking equipment across shoots, and makes sure nothing is forgotten on a job.")]

# ===== 10. NEWSROOM =====
story += [PageBreak(), KICK("SECTION 10"), H1("The newsroom (editorial portal)")]
story += [P("editorial.dot1.media is where all Dot 1 News journalism happens. Newsroom access is by <b>role</b>, and roles are made of individual capabilities an Owner can grant one at a time.")]
story += [H2("10.1 Roles")]
story += [B("<b>Reporter</b> — creates and works stories (sources, evidence, reporting log, verification, ratings). Cannot publish."),
          B("<b>Editor</b> — a Reporter plus assigning/moving stories, approving, publishing, corrections, standards, and the audit log."),
          B("<b>Producer</b> — runs the broadcast: graphics, going live, publishing episodes, uploading media."),
          B("<b>Viewer</b> — reads the newsroom and watches broadcast without changing anything."),
          B("<b>Owner</b> — everything, and grants access. Cannot be locked out.")]
story += [H2("10.2 What each role can do")]
def chk(has): return Paragraph("●", ParagraphStyle("k", parent=st["tblc"], textColor=(GREEN if has else HexColor("#d8d0c0"))))
cap_rows = [
    ("View the newsroom", 1,1,1,1,1), ("Create / write stories", 1,1,0,0,1),
    ("Manage sources & evidence", 1,1,0,0,1), ("Add to the reporting log", 1,1,1,0,1),
    ("Work verification", 1,1,0,0,1), ("Add a second rating (score)", 1,1,0,0,1),
    ("Assign / move / delete stories", 0,1,0,0,1), ("Approve for publication", 0,1,0,0,1),
    ("Publish to the app & site", 0,1,0,0,1), ("Manage corrections", 0,1,0,0,1),
    ("Edit editorial standards", 0,1,0,0,1), ("View the audit log", 0,1,0,0,1),
    ("Upload media", 1,1,1,0,1), ("Publish recorded episodes", 0,1,1,0,1),
    ("Run on-air graphics", 0,0,1,0,1), ("Go live", 0,0,1,0,1),
    ("Send push notifications", 0,1,1,0,1), ("Manage staff accounts", 0,0,0,0,1),
]
head = [Paragraph("Capability", st["tblh"])] + [Paragraph(r, st["tblh"]) for r in ["Rep.", "Ed.", "Prod.", "View.", "Own."]]
data = [head] + [[Paragraph(r[0], st["tbl"])] + [chk(r[i]) for i in range(1, 6)] for r in cap_rows]
t = Table(data, colWidths=[228, 50, 50, 50, 50, 50], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), DEEP), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), PAPER]),
    ("GRID", (0, 0), (-1, -1), 0.5, HAIR), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story += [t]

story += [H2("10.3 The life of a story")]
story += [B("<b>Origin</b> — a reporter writes it, the AI Desk drafts it from the wire, or it's promoted from a public tip."),
          B("<b>Reporting</b> — build the record: sources, evidence, a timestamped reporting log, and verification."),
          B("<b>The review ladder</b> — status is computed automatically: Not Verified → Partially Verified → Verified → Editor Approved → Ready to Publish. The system enforces the standard; a story can't skip verification."),
          B("<b>Scoring</b> — every story is dual-rated (a machine rating plus an independent human second rating, reconciled). Dual-rated stories carry a verified mark to readers."),
          B("<b>Publish</b> — writes the story to the app and news site at once; AI stories that are Ready and fully dual-rated can auto-publish, everything else is deliberate.")]
story += [H2("10.4 Oversight")]
story += [B("<b>Published archive</b> — everything live (articles, photos, videos); edit or remove. Deletes take effect immediately."),
          B("<b>Standards &amp; corrections</b> — the public editorial standards and the correction ledger."),
          B("<b>Audit log</b> — who did what, our internal accountability trail.")]

# ===== 11. READERS =====
story += [PageBreak(), KICK("SECTION 11"), H1("What readers see (app & news site)")]
story += [B("<b>The reader app (Dot 1 News)</b> — public and reader-only: latest stories, a red LIVE banner when we're broadcasting, a videos area for episodes, and push notifications. No staff functions live in the app."),
          B("<b>news.dot1.media</b> — the reader website with the same stories, the standpoint pages (standards, corrections, ownership, advertising, contact), a /live page, and a Send a news tip page."),
          B("<b>Tips</b> from the app and both websites all land in the newsroom's Tips queue; some are anonymous — protect confidentiality.")]

# ===== 12. BROADCAST =====
story += [PageBreak(), KICK("SECTION 12"), H1("Broadcast — the production process")]
story += [P("The studio runs one switch that feeds both a widescreen (16:9) program and a vertical (9:16) social output, with on-air graphics driven from the editorial portal.")]
story += [H2("12.1 Equipment & signal flow")]
story += [P("The chain: <b>Cameras → ATEM switcher → OBS (adds graphics) → recording or live stream</b>, with graphics reaching OBS from the portal.")]
story += [B("<b>Cameras (Canon C50 / C400)</b> → HDMI into ATEM inputs 1–4."),
          B("<b>ATEM Mini Pro ISO</b> switches cameras and mixes audio; one USB-C cable carries the program to the computer as a webcam."),
          B("<b>A mic</b> goes into the ATEM's 3.5&nbsp;mm input (or camera audio over HDMI)."),
          B("<b>OBS</b> takes the ATEM feed, lays the graphics overlay on top, and records or streams."),
          B("<b>The editorial portal</b> drives lower thirds, bug, ticker, and breaking, live.")]
story += [box([NOTE("One rule prevents most problems: cameras, ATEM, and OBS should all run the same frame rate (all 1080p 30, or all 1080p 60).")])]
story += [H2("12.2 Cameras, audio, ATEM")]
story += [B("Cameras: turn on clean HDMI output (no menus on air), set all to the same 1920×1080 frame rate, and frame subjects near centre so the 9:16 crop works."),
          B("Audio: mic into the ATEM, host mic ON in the mixer, peaks around −12 to −6&nbsp;dB (red is clipping)."),
          B("ATEM: cameras to HDMI 1–4, USB-C to the computer; Program buttons pick what's live (CUT hard-cuts, AUTO transitions); an optional USB-C SSD records each input for editing.")]
story += [H2("12.3 OBS — 16:9 and 9:16")]
story += [B("<b>16:9 program</b>: add the ATEM as a Video Capture Device (1920×1080); add the overlay as a Browser Source using the Program URL from Broadcast → Live tools; place it above the camera. It runs transparent automatically."),
          B("<b>9:16 vertical</b>: a separate OBS profile at 1080×1920, the ATEM cropped to a centre 9:16, and the vertical overlay Browser Source on top. It reads the same graphics, so one push drives both; the ticker shows as a headline strap on vertical.")]
story += [H2("12.4 On-air graphics (from the portal)")]
story += [B("<b>Lower thirds</b>: Broadcast → open a rundown segment → Take to air; Clear removes it."),
          B("<b>Bug, ticker, breaking</b>: Broadcast → On-air graphics → Show / Hide; edit the ticker and Update."),
          B("Pushes appear on the OBS overlay within about a second, on both outputs. Needs broadcast permission.")]
story += [H2("12.5 Recorded episodes (DaVinci → publish)")]
story += [N(1, "Record (OBS or the ATEM's ISO record)."),
          N(2, "Edit and colour in DaVinci Resolve; export a finished 1080p file."),
          N(3, "Broadcast → Publish episode; add title, description, category, host; drop in the file; Upload &amp; publish (or draft)."),
          N(4, "It uploads to Cloudflare Stream (resumable), is encoded, and appears in the app and site, under Published → Videos.")]
story += [H2("12.6 Going live")]
story += [N(1, "One-time: Broadcast → Go live → Set up live input; copy the OBS Server URL and Stream key."),
          N(2, "OBS: Settings → Stream → service Custom; paste them; Start Streaming."),
          N(3, "In the portal, press Go live and set a title; the LIVE surface appears on the site and app and a notification goes out."),
          N(4, "End broadcast when done; Cloudflare keeps the recording, which can become an episode.")]
story += [box([NOTE("The Stream key is a credential — Producer/Owner only; never paste it publicly. Normal quirks: a 10–20 second beat before the stream is playable, and a short delay behind real time.")])]

# ===== 13. AUDIENCE =====
story += [PageBreak(), KICK("SECTION 13"), H1("Reaching the audience")]
story += [B("<b>Push notifications</b> — automatic when we go live and when an episode publishes; a Send Alert page pushes breaking news to everyone with the app (preview + confirm). We don't notify on every story, to avoid spamming."),
          B("<b>Readership analytics</b> — the Readership page shows reads, unique readers, app opens, live tune-ins, a 14-day chart, and most-read stories. First-party and anonymous: no names, no IP, no third-party trackers."),
          B("<b>News tips</b> — public submissions from the app and both websites arrive in the Tips queue; can be anonymous.")]

# ===== 14. RUNBOOKS =====
story += [PageBreak(), KICK("SECTION 14"), H1("Routine procedures (runbooks)")]
story += [H2("Book a client (studio)")]
story += [N(1, "Sessions → New internal booking (or send an invoice, below)."),
          N(2, "Enter client, service, date/time, and any amount to collect now."),
          N(3, "Create it; the client is emailed the agreement and details (and a payment request if set).")]
story += [H2("Send an invoice")]
story += [N(1, "Sessions → New invoice; enter client, service, add-ons or custom lines; preview."),
          N(2, "Send; the client gets the PDF and a 50% retainer payment link."),
          N(3, "After paying, they sign agreements and set a password, then reach their dashboard.")]
story += [H2("Move a session to delivery")]
story += [N(1, "Advance the session stage by stage (choose whether to email at each)."),
          N(2, "At delivery, paste the gallery link (photos) or video link, and confirm the send."),
          N(3, "At final delivery, the client is invited to leave a review.")]
story += [H2("Check gear out & back in")]
story += [N(1, "Assets → Checked Out → check out the package for the shoot with a due-back date."),
          N(2, "After the shoot, check it in; overdue kits are flagged until returned.")]
story += [H2("Publish a news story")]
story += [N(1, "Complete sources, evidence, reporting log, and verification to Verified."),
          N(2, "Add the independent second rating; editor approves to Ready to Publish."),
          N(3, "Publish; confirm it appears on the site and in the app.")]
story += [H2("Produce a recorded episode")]
story += [N(1, "Record, then edit and colour in DaVinci; export 1080p."),
          N(2, "Broadcast → Publish episode; fill metadata; upload; publish.")]
story += [H2("Run a live broadcast")]
story += [N(1, "Dry-run the gear; Set up live input; paste Server/key in OBS; Start Streaming."),
          N(2, "Go live in the portal with a title; drive graphics; End broadcast when done.")]

# ===== 15. TROUBLESHOOTING =====
story += [PageBreak(), KICK("SECTION 15"), H1("Troubleshooting")]
trb = [
    ("A page or button is missing", "It's gated to a role you don't have. Ask an Owner (newsroom) or the studio."),
    ("Can't get into the asset system", "Sign in at portal.dot1.media first; that same login carries into assets."),
    ("A client's payment didn't show", "Use the Check / Sync button to re-query Square; deposits and balances reconcile automatically."),
    ("A client didn't get an email", "Delivery depends on our email domain being verified; copy the payment or gallery link from the session and send it another way, and have the domain settings checked."),
    ("A booking or portal change didn't appear", "The portal caches; hard-refresh the page twice to pick up the newest version."),
    ("Gear shows as out but isn't", "Someone checked a package out and didn't check it in — check it in from Assets → Checked Out."),
    ("A story won't publish", "It isn't Ready to Publish — finish verification and editor approval."),
    ("Graphics don't show in OBS", "Refresh the browser source; confirm the correct Program URL (16:9 vs 9:16) and that you pushed from the portal with broadcast rights."),
    ("/live is black or no banner", "Give it 10–20 seconds after Start Streaming and refresh; confirm you pressed Go live."),
    ("Notification didn't arrive", "The reader must have allowed notifications and be on a current build; test on a real device."),
]
for q, a in trb:
    story += [Paragraph(f"<b>{q}</b>", ParagraphStyle("tq", parent=st["body"], textColor=DEEP, spaceAfter=1)),
              Paragraph(a, ParagraphStyle("ta", parent=st["body"], leftIndent=10, spaceAfter=6))]

# ===== 16. MAINTAINER =====
story += [PageBreak(), KICK("SECTION 16"), H1("Maintainer & admin reference")]
story += [P("For whoever maintains the software (the Owner or a technical contact), not day-to-day staff.")]
story += [H3("Cross-app sign-in")]
story += [B("The shared studio login works because the portal and asset system use the same signing secret. That secret must be identical across both hosting projects."),
          B("The newsroom and news app are intentionally separate logins.")]
story += [H3("Payments, email & integrations (portal)")]
story += [B("Square provides payments; a signed webhook keeps records in sync once configured in the Square dashboard."),
          B("Email is sent through Resend; the dot1.media domain must be verified (SPF/DKIM/DMARC) or messages may not land, especially at Gmail/Outlook/military inboxes."),
          B("The Google review link and the asset-system connection (for gear-package dropdowns) are set as configuration on the portal.")]
story += [H3("Video & app")]
story += [B("Live and recorded video use Cloudflare Stream (account id, Stream token, and the customer-code — the code only)."),
          B("App releases: JavaScript/content changes can ship over-the-air; native changes (splash, icon, permissions, push) need a new build. Bump the version if the current one is already on the store.")]
story += [H3("Housekeeping")]
story += [B("The client portal caches aggressively; its service-worker cache name must be bumped every deploy or clients see stale pages."),
          B("Agreement PDFs live in the dot1.media website repository, separate from the portal."),
          B("Secrets (Square keys, Stream key, tokens) are never committed or posted; if one leaks, rotate it (for live, provision a new live input).")]

# ===== 17. GLOSSARY =====
story += [PageBreak(), KICK("SECTION 17"), H1("Glossary")]
gloss = [
    ("ATEM", "The Blackmagic video switcher that combines the cameras and audio into one feed."),
    ("Bug", "The small on-screen logo/identifier during a broadcast."),
    ("Check-out / check-in", "Taking a gear package out for a shoot and returning it, tracked in the asset system."),
    ("CloudSpot", "The studio's photo gallery/delivery tool; the portal links out to its galleries."),
    ("D1-4LS", "Dot 1 News's rating framework; stories are dual-rated against it."),
    ("Dual rating", "A machine rating plus an independent human second rating, reconciled."),
    ("Internal booking", "A studio-only session created without a client portal account (email only)."),
    ("Invoice", "A bill sent to a client that doubles as a booking once the retainer is paid."),
    ("Lifecycle", "When equipment needs replacing (purchase date + lifespan) or a license renewing (renewal date)."),
    ("OBS", "The studio computer software that adds graphics and records/streams."),
    ("OTA", "Over-the-air: shipping a JavaScript app update without an app-store review."),
    ("Package", "A named kit of gear built from inventory and attached to a session type."),
    ("Retainer", "The up-front payment to secure a booking (video 50%; photography full or half)."),
    ("Review ladder", "The automatic status a story climbs from Not Verified to Ready to Publish."),
    ("Session", "A single client job in the portal, tracked along the status timeline."),
    ("SSO", "Single sign-on: one studio login that works across the portal and the asset system."),
    ("Status timeline", "The seven stages a client session moves through, visible to the client."),
    ("Square", "Our payment processor for client work."),
]
for term, d in gloss:
    story += [Paragraph(f"<b>{term}</b> — {d}", ParagraphStyle("gl", parent=st["body"], leftIndent=12, firstLineIndent=-12, spaceAfter=5))]

story += [SP(14), box([Paragraph("Dot One Media · A Declared Standpoint", ParagraphStyle("end", parent=st["body"], alignment=TA_CENTER, textColor=DEEP)),
    Paragraph("This handbook is regenerated as the systems change. Each portal also has its own in-app guide with the finest detail.", ParagraphStyle("end2", parent=st["body"], alignment=TA_CENTER, fontSize=8, textColor=MUTED))], bg=HexColor("#f6efe0"), stroke=GOLD)]

def build():
    doc = Manual(PATH)
    doc.multiBuild(story)
    print("Employee Handbook:", os.path.getsize(PATH), "bytes")

if __name__ == "__main__":
    build()
