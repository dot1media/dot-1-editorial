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
PATH = os.path.join(OUT, "Dot1News-Operations-Manual.pdf")

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
        self.title = "Dot 1 News — Operations Manual"
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
        c.setFillColor(INK); c.setFont("Times-Bold", 9); c.drawString(64, letter[1] - 46, "DOT 1 NEWS")
        c.setFillColor(MUTED); c.setFont("Courier", 7)
        c.drawRightString(letter[0] - 64, letter[1] - 46, "OPERATIONS MANUAL")
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
story += [Spacer(1, 250),
          Paragraph("DOT 1 NEWS", st["cover_t"]),
          Spacer(1, 10),
          Paragraph("Operations Manual", ParagraphStyle("ct2", parent=st["cover_t"], fontSize=22, textColor=GOLD)),
          Spacer(1, 18),
          Paragraph("Running the newsroom, the app, the websites,<br/>and the broadcast — a staff handbook", st["cover_s"]),
          Spacer(1, 120),
          Paragraph("JUST TRUTH · NO BIAS", st["cover_m"]),
          Paragraph("A Declared Standpoint", st["cover_m"]),
          Spacer(1, 8),
          Paragraph("Confidential · for Dot 1 News staff", st["cover_m"]),
          NextPageTemplate("normal"), PageBreak()]

# ---------------- table of contents ----------------
toc = TableOfContents()
toc.levelStyles = [st["toc1"], st["toc2"]]
story += [KICK("CONTENTS"), Paragraph("What's in this manual", ParagraphStyle("tochead", parent=st["h1"])), SP(6), toc, PageBreak()]

# ================= 1. WELCOME =================
story += [KICK("SECTION 1"), H1("Welcome, and how to use this manual")]
story += [P("This manual is the single reference for running Dot 1 News. It covers every tool we use — the newsroom portal, the reader app, the websites, and the broadcast studio — plus the procedures that tie them together and the permissions that govern who does what. If you are new, read it front to back once; afterward, use the contents and the runbooks in Section 8 as a day-to-day reference.")]
story += [P("Our standard is in the name: <b>Just Truth, No Bias</b>, and our posture is <b>A Declared Standpoint</b> — we are open about who we are and we hold every story to a documented, dual-checked process. The tools in this manual exist to make that standard repeatable, not optional.")]
story += [H3("How the manual is organized")]
story += [B("Sections 2–5 cover the newsroom and what readers see."),
          B("Section 6 is the full broadcast process and equipment."),
          B("Section 7 covers reaching the audience: notifications, analytics, and tips."),
          B("Section 8 is step-by-step runbooks you'll use repeatedly."),
          B("Sections 9–11 are troubleshooting, a maintainer reference, and a glossary.")]
story += [SP(4), box([NOTE("Access is by role. If a page or button described here isn't visible to you, it's gated to a role you don't have. That's expected — ask an Owner if you need it.")])]

# ================= 2. ECOSYSTEM =================
story += [PageBreak(), KICK("SECTION 2"), H1("The Dot 1 News ecosystem at a glance")]
story += [P("Dot 1 News is one connected system with several front doors. Everything the newsroom does happens in the <b>editorial portal</b>; from there, finished work flows out to the <b>reader app</b> and the <b>news website</b>, and the <b>broadcast studio</b> feeds live and recorded video into the same places.")]
story += [H3("The systems and their addresses")]
sysrows = [
    [Paragraph("System", st["tblh"]), Paragraph("Address", st["tblh"]), Paragraph("What it is / who uses it", st["tblh"])],
    [Paragraph("Editorial portal", st["tbl"]), Paragraph("editorial.dot1.media", st["tbl"]), Paragraph("The newsroom. Staff only. Write, verify, score, publish, run broadcast and live.", st["tbl"])],
    [Paragraph("News website", st["tbl"]), Paragraph("news.dot1.media", st["tbl"]), Paragraph("Public reader site: stories, live page, standpoint pages, news-tip form.", st["tbl"])],
    [Paragraph("Reader app", st["tbl"]), Paragraph("Dot 1 News (App Store)", st["tbl"]), Paragraph("Public iOS/Android app. Reading, live banner, videos, notifications.", st["tbl"])],
    [Paragraph("Company site", st["tbl"]), Paragraph("dot1.media", st["tbl"]), Paragraph("Dot One Media marketing site; also carries a news-tip button.", st["tbl"])],
    [Paragraph("Broadcast overlays", st["tbl"]), Paragraph("editorial.dot1.media/broadcast/…", st["tbl"]), Paragraph("The on-air graphics OBS loads (16:9 and 9:16).", st["tbl"])],
]
t = Table(sysrows, colWidths=[95, 150, 235])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), DEEP), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), PAPER]),
    ("GRID", (0, 0), (-1, -1), 0.5, HAIR), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
story += [t, SP(8)]
story += [H3("How work flows through it")]
story += [P("A story starts in the editorial portal (written by a reporter, generated by the AI Desk, or promoted from a public tip). It climbs a verification ladder, gets a dual rating, and an editor approves it. On publish, it's written to the news database that both the app and the news website read, so it appears to the public in both places at once. Live and recorded video follow a parallel path through the broadcast studio into the same app and site.")]

# ================= 3. ACCOUNTS & PERMISSIONS =================
story += [PageBreak(), KICK("SECTION 3"), H1("Accounts, roles & permissions")]
story += [P("Every staff member signs in to the editorial portal with their own account. What you can see and do is decided by your <b>role</b>. Roles are made of individual <b>capabilities</b>, and an Owner can grant any single capability to any person — so access can be tailored without inventing new roles.")]
story += [H2("The roles")]
story += [B("<b>Reporter</b> — creates and works stories: sources, evidence, the reporting log, verification, and ratings. Cannot publish.")]
story += [B("<b>Editor</b> — everything a Reporter does, plus assigning and moving stories, approving, publishing, corrections, standards, and the audit log.")]
story += [B("<b>Producer</b> — runs the broadcast: on-air graphics, going live, publishing recorded episodes, uploading media.")]
story += [B("<b>Viewer</b> — reads the newsroom and can watch the broadcast area without changing anything.")]
story += [B("<b>Owner</b> — can do everything, and grants access to others. Cannot be locked out.")]
story += [SP(4), box([NOTE("Roles are a starting point. Because access is per-capability, an Owner can, for example, give one trusted reporter the ability to publish without making them a full Editor.")])]

story += [H2("What each role can do")]
def chk(has): return Paragraph("●", ParagraphStyle("k", parent=st["tblc"], textColor=(GREEN if has else HexColor("#d8d0c0")))) 
cap_rows = [
    ("View the newsroom", 1,1,1,1,1),
    ("Create / write stories", 1,1,0,0,1),
    ("Manage sources & evidence", 1,1,0,0,1),
    ("Add to the reporting log", 1,1,1,0,1),
    ("Work verification", 1,1,0,0,1),
    ("Add a second rating (score)", 1,1,0,0,1),
    ("Assign / move / delete stories", 0,1,0,0,1),
    ("Approve for publication", 0,1,0,0,1),
    ("Publish to the app & site", 0,1,0,0,1),
    ("Manage corrections", 0,1,0,0,1),
    ("Edit editorial standards", 0,1,0,0,1),
    ("View the audit log", 0,1,0,0,1),
    ("Upload media", 1,1,1,0,1),
    ("Publish recorded episodes", 0,1,1,0,1),
    ("Run on-air graphics", 0,0,1,0,1),
    ("Go live", 0,0,1,0,1),
    ("Send push notifications", 0,1,1,0,1),
    ("Manage staff accounts", 0,0,0,0,1),
]
head = [Paragraph("Capability", st["tblh"])] + [Paragraph(r, st["tblh"]) for r in ["Rep.", "Ed.", "Prod.", "View.", "Own."]]
data = [head]
for row in cap_rows:
    data.append([Paragraph(row[0], st["tbl"])] + [chk(row[i]) for i in range(1, 6)])
t = Table(data, colWidths=[228, 50, 50, 50, 50, 50], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), DEEP), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), PAPER]),
    ("GRID", (0, 0), (-1, -1), 0.5, HAIR), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story += [t, SP(8)]
story += [H3("Signing in & getting an account")]
story += [B("An Owner creates your account from Accounts and assigns your role. You sign in at editorial.dot1.media."),
          B("The reader app is public and reader-only — staff work never happens in the app. If the app ever asks you to sign in as an admin, that's the wrong place; use the portal."),
          B("Treat your login as a credential. Don't share it; each person's actions are recorded in the audit log under their own name.")]

# ================= 4. NEWSROOM =================
story += [PageBreak(), KICK("SECTION 4"), H1("The newsroom (editorial portal)")]
story += [P("The editorial portal is where all journalism happens. This section walks the full life of a story from origin to publication, plus the standards and oversight tools around it.")]

story += [H2("4.1 Where stories come from")]
story += [B("<b>A reporter</b> creates one directly."),
          B("<b>The AI Desk</b> pulls the wire and drafts a story with an initial machine rating, which lands in the queue for a human to verify."),
          B("<b>A public tip</b> (from the app or either website) arrives in the Tips queue and can be promoted into a story.")]

story += [H2("4.2 Creating & reporting a story")]
story += [P("Open a story and work these tools, which together build the record behind the reporting:")]
story += [B("<b>Sources</b> — who and what the story rests on. Add each source and what it supports."),
          B("<b>Evidence</b> — documents, links, files, and screenshots that back specific claims."),
          B("<b>Reporting log</b> — a running, timestamped record of what you did (calls made, records pulled). This is how the newsroom shows its work."),
          B("<b>Verification</b> — the checklist and per-claim checks that move the story up the ladder."),
          B("Write the story body and, for broadcast, the script in the same place.")]

story += [H2("4.3 The AI Desk")]
story += [P("The AI Desk drafts stories from the wire and gives each an initial rating. These are <b>starting points, not published work</b>: every AI draft still has to be verified and, before it can auto-publish, must reach Ready to Publish and carry a complete dual rating (a human second rating). If the AI Desk reports it isn't configured, a maintainer needs to set its key — that's not something the newsroom fixes day to day.")]

story += [H2("4.4 Triaging tips")]
story += [P("Tips from the public arrive in the Tips queue (each tagged with where it came from — the app, the news site, or the company site). Review them, and when one is worth pursuing, promote it into a story where it enters the normal workflow. Some tips are sent anonymously; respect that.")]

story += [H2("4.5 The review ladder")]
story += [P("A story's status is <b>computed automatically</b> from the work done on it — you don't set it by hand. The rungs are:")]
story += [N(1, "<b>Not Verified</b> — nothing checked yet."),
          N(2, "<b>Partially Verified</b> — some claims/checklist done."),
          N(3, "<b>Verified</b> — claims and checklist satisfied."),
          N(4, "<b>Editor Approved</b> — an editor has signed off."),
          N(5, "<b>Ready to Publish</b> — cleared to go to the app and site.")]
story += [P("The ladder means the standard is enforced by the system: a story can't quietly skip verification.")]

story += [H2("4.6 Scoring: the dual rating")]
story += [P("Dot 1 News rates its reporting with the D1-4LS framework across a set of indicators. What matters operationally: a story is <b>dual-rated</b> — a machine rating plus an independent <b>human second rating</b> — and the two are reconciled. A story that has been dual-rated carries a verified mark to readers. Add your second rating on the story's Score tab; don't rate your own draft as the second rater where the newsroom expects independence.")]

story += [H2("4.7 Approval & publishing")]
story += [B("An <b>editor approves</b> the story, which lifts it toward Ready to Publish."),
          B("<b>Publishing</b> writes the story to the app and news website at once. AI stories that are Ready to Publish and fully dual-rated can auto-publish; everything else is published deliberately."),
          B("Publishing records provenance: readers see whether a story was approved by an editor and verified by two raters.")]

story += [H2("4.8 The Published archive")]
story += [P("Everything live sits under <b>Published</b>, split into articles, photos, and videos. From there you can edit an article's details or remove an item. <b>Deletes take effect immediately</b> on the app and site, so treat them with care. Removing an article also detaches it in the newsroom.")]

story += [H2("4.9 Standards, corrections & the audit log")]
story += [B("<b>Standards</b> — the public editorial standards and classifications, edited by editors, shown on the news site."),
          B("<b>Corrections</b> — the correction ledger. When we get something wrong, we log the correction; it publishes to the site."),
          B("<b>Audit log</b> — a record of who did what (published, deleted, went live, sent an alert). This is our internal accountability trail.")]

# ================= 5. READERS =================
story += [PageBreak(), KICK("SECTION 5"), H1("What readers see")]
story += [H2("The reader app (Dot 1 News)")]
story += [P("The app is public and reader-only. Readers get the latest stories, a red <b>LIVE</b> banner on the home screen whenever we're broadcasting (tapping it opens the live player), a videos area for recorded episodes, and push notifications. There is no staff functionality in the app by design — all production happens in the portal.")]
story += [H2("The news website (news.dot1.media)")]
story += [B("The public reader site, carrying the same published stories."),
          B("<b>Standpoint pages</b> — standards, corrections, ownership, advertising, and contact, fed from the newsroom."),
          B("A <b>/live</b> page that shows the stream when we're on air."),
          B("A <b>Send a news tip</b> page linked in the footer.")]
story += [H2("The company site (dot1.media)")]
story += [P("Dot One Media's main site also carries a <b>Submit a news tip</b> button so tips can come from there too. All tips, from anywhere, land in the same newsroom Tips queue.")]

# ================= 6. BROADCAST =================
story += [PageBreak(), KICK("SECTION 6"), H1("Broadcast — the production process")]
story += [P("This section covers the studio end to end: how the gear connects, how to run a show, how to publish a recorded episode, and how to go live. The same switch feeds both a widescreen (16:9) program and a vertical (9:16) social output, and on-air graphics are driven from the portal.")]

story += [H2("6.1 Equipment & signal flow")]
story += [P("The chain is: <b>Cameras → ATEM switcher → OBS (adds graphics) → recording or live stream</b>. Graphics reach OBS from the portal through a server channel. Lay it out like this:")]
story += [B("<b>Cameras (Canon C50 / C400)</b> connect by HDMI into the ATEM's inputs 1–4."),
          B("<b>ATEM Mini Pro ISO</b> switches between cameras and mixes audio; a single USB-C cable carries the program to the computer, where it appears as a webcam."),
          B("<b>A microphone</b> goes into the ATEM's 3.5&nbsp;mm audio input (or camera audio rides the HDMI)."),
          B("<b>OBS</b> on the computer takes the ATEM feed, lays the Dot 1 News graphics overlay on top, and records or streams."),
          B("<b>The editorial portal</b> drives the graphics (lower thirds, bug, ticker, breaking) live.")]
story += [box([NOTE("One rule prevents most problems: cameras, ATEM, and OBS should all run at the same frame rate (all 1080p 30, or all 1080p 60). Mixed frame rates cause stutter and audio drift.")])]

story += [H2("6.2 Cameras (Canon C50 / C400)")]
story += [B("Turn on <b>clean HDMI output</b> so menus and focus guides don't appear on air."),
          B("Set every camera to the same resolution and frame rate: 1920×1080, all 30p or all 60p."),
          B("Run each camera's HDMI into ATEM inputs 1–4; seat connectors firmly."),
          B("Frame with vertical in mind — the 9:16 output is a centre crop of the 16:9 picture, so keep subjects near centre."),
          B("Optionally let cameras also record locally as a backup.")]

story += [H2("6.3 Audio")]
story += [B("Simplest path: a host mic into the ATEM's 3.5&nbsp;mm input; set its level on the ATEM."),
          B("In the ATEM audio mixer, set the host mic to ON; use audio-follows-video for sources that should only be heard when live."),
          B("Aim for peaks around −12 to −6&nbsp;dB. Red (0&nbsp;dB) is clipping — turn it down.")]

story += [H2("6.4 ATEM Mini Pro ISO")]
story += [B("<b>Connect</b>: cameras to HDMI IN 1–4; USB-C to the computer; optional HDMI OUT to a monitor."),
          B("<b>Switch</b>: the Program buttons pick what's live; CUT is a hard cut, AUTO runs the selected transition."),
          B("<b>ISO record</b> (optional): a fast USB-C SSD records each input separately for editing in DaVinci later."),
          B("The ATEM Software Control app gives deeper audio and macro settings; not required for a basic show.")]

story += [H2("6.5 OBS — the 16:9 program")]
story += [N(1, "Add the ATEM feed: Sources → + → <b>Video Capture Device</b> → pick the Blackmagic ATEM; set 1920×1080."),
          N(2, "Set the canvas: Settings → Video → Base and Output 1920×1080, FPS matching the cameras."),
          N(3, "Add the overlay: Sources → + → <b>Browser Source</b>, URL from the portal's Broadcast → Live tools (the 16:9 Program URL, <font face='Courier'>editorial.dot1.media/broadcast/dot1-news-broadcast.html</font>), 1920×1080."),
          N(4, "Place the overlay <b>above</b> the camera source. It detects OBS and runs transparent automatically."),
          N(5, "Confirm the ATEM's audio appears in the OBS Audio Mixer.")]

story += [H2("6.6 OBS — the 9:16 vertical / social output")]
story += [P("For TikTok, Reels, and Shorts, run a second, vertical output. It reads the same graphics, so one push from the portal drives both formats.")]
story += [N(1, "Make a separate OBS <b>profile and scene collection</b> so it stays independent."),
          N(2, "Set the canvas to <b>1080×1920</b> (portrait), same FPS as the 16:9 profile."),
          N(3, "Add the ATEM and crop it to a centre 9:16 (don't stretch)."),
          N(4, "Add the vertical overlay Browser Source (the vertical Program URL, <font face='Courier'>…/dot1-news-vertical.html</font>), 1080×1920, above the camera."),
          N(5, "On the vertical, the ticker shows as a headline <b>strap</b> instead of a crawl; lower third, bug, and breaking carry over identically.")]

story += [H2("6.7 On-air graphics (driven from the portal)")]
story += [P("You control graphics from the portal, not from OBS — OBS just displays what the portal sends. A producer needs go-live/broadcast permission.")]
story += [B("<b>Lower thirds</b>: Broadcast → open a rundown segment → Take to air; Clear removes it."),
          B("<b>Bug, ticker, breaking</b>: Broadcast → On-air graphics → Show / Hide; edit the ticker and press Update."),
          B("Anything you push appears on the OBS overlay within about a second, on both the 16:9 and 9:16 outputs.")]

story += [H2("6.8 Recorded episodes (DaVinci → publish)")]
story += [N(1, "Record the show in OBS, or use the ATEM's ISO record for separate camera files."),
          N(2, "Edit and colour in <b>DaVinci Resolve</b>; export a finished file (1080p H.264/H.265 MP4 is ideal)."),
          N(3, "In the portal: Broadcast → <b>Publish episode</b>. Add title, description, category, and host."),
          N(4, "Drop in the exported file and press Upload &amp; publish (or Upload as draft)."),
          N(5, "The file uploads to Cloudflare Stream (resumable — a large export is fine); it's encoded and appears in the app and site, and lives under Published → Videos.")]
story += [NOTE("Producers, editors, and owners can publish episodes. Keep the tab open until the upload reaches 100%.")]

story += [H2("6.9 Going live")]
story += [P("Live streams to the app and site through Cloudflare Stream, controlled from Broadcast → Go live.")]
story += [N(1, "<b>One-time</b>: a producer presses <b>Set up live input</b>, which returns an OBS Server URL and a Stream key."),
          N(2, "In OBS: Settings → Stream → service <b>Custom</b>; paste the Server and Stream key; Start Streaming."),
          N(3, "In the portal, press <b>Go live</b> and set a title. The LIVE surface appears on the site and app within seconds, and a notification goes out."),
          N(4, "Drive graphics from On-air graphics as usual."),
          N(5, "Press <b>End broadcast</b> when done. Cloudflare keeps the recording, which can become a posted episode.")]
story += [box([NOTE("The Stream key is a credential — anyone with it could broadcast as us. It's Producer/Owner only; never paste it anywhere public. If it leaks, ask for a new live input to be provisioned. Two normal things: a 10–20 second beat after Start Streaming before the stream is playable, and a short delay behind real time (inherent to live video).")])]

story += [H2("6.10 Before every broadcast — dry run")]
story += [N(1, "Cameras: clean HDMI on, all the same 1080p frame rate, into ATEM 1–4."),
          N(2, "Audio: mic in, level set, mixer ON, no red clipping."),
          N(3, "ATEM: USB-C to the computer; cut through inputs and confirm every camera shows."),
          N(4, "OBS: ATEM as Video Capture Device; overlay Browser Source on top; audio in the mixer."),
          N(5, "Portal: Broadcast → On-air graphics; Show the bug → confirm in OBS → Hide."),
          N(6, "Lower third: Take from a rundown segment → confirm → Clear."),
          N(7, "Record a 60-second test while switching cameras and pushing graphics; review it."),
          N(8, "If going live: Set up live input → OBS server/key → Start Streaming → Go live → confirm /live and the app banner → End.")]

# ================= 7. AUDIENCE =================
story += [PageBreak(), KICK("SECTION 7"), H1("Reaching the audience")]
story += [H2("7.1 Push notifications")]
story += [B("<b>Automatic</b>: readers are notified when we go live and when a recorded episode is published."),
          B("<b>Manual</b>: the <b>Send Alert</b> page pushes a breaking-news alert to everyone with the app; it has a live preview and a confirm step. Sending needs publish or broadcast permission."),
          B("We deliberately do <b>not</b> notify on every published story, to avoid overwhelming readers. Use Send Alert for the ones that matter.")]
story += [H2("7.2 Readership analytics")]
story += [P("The <b>Readership</b> page shows reads, unique readers, app opens, live tune-ins, a 14-day readers-per-day chart, and most-read stories. It's <b>first-party and anonymous</b> — a random per-device id, no names, no IP, no third-party trackers. We measure our audience without surveilling them, which is consistent with our standard.")]
story += [H2("7.3 News tips")]
story += [P("The public can submit tips from the app and from both websites. Tips can be anonymous. They all arrive in the newsroom Tips queue for triage (Section 4.4). Protect tipster confidentiality.")]

# ================= 8. RUNBOOKS =================
story += [PageBreak(), KICK("SECTION 8"), H1("Routine procedures (runbooks)")]
story += [H2("Publishing a story")]
story += [N(1, "Open the story; complete sources, evidence, and the reporting log."),
          N(2, "Work verification until the ladder reaches Verified."),
          N(3, "Add the independent second rating on the Score tab."),
          N(4, "Editor reviews and approves → Ready to Publish."),
          N(5, "Publish. Confirm it appears on the news site and in the app.")]
story += [H2("Producing a recorded episode")]
story += [N(1, "Record (OBS or ATEM ISO)."),
          N(2, "Edit and colour in DaVinci; export a finished 1080p file."),
          N(3, "Broadcast → Publish episode; fill metadata; upload; publish."),
          N(4, "Confirm it appears under Published → Videos and in the app once encoded.")]
story += [H2("Running a live broadcast")]
story += [N(1, "Complete the dry run (6.10)."),
          N(2, "Set up live input (once) → paste Server/key in OBS → Start Streaming."),
          N(3, "Go live in the portal with a title; confirm /live and the app banner."),
          N(4, "Drive graphics from On-air graphics."),
          N(5, "End broadcast; the recording is kept for posting.")]
story += [H2("Sending breaking news")]
story += [N(1, "Broadcast/publish the story first so there's something to open."),
          N(2, "Send Alert → write a short title and message → check the preview → Confirm send.")]

# ================= 9. TROUBLESHOOTING =================
story += [PageBreak(), KICK("SECTION 9"), H1("Troubleshooting")]
trb = [
    ("A page or button is missing", "It's gated to a role you don't have. Ask an Owner to grant it in Accounts."),
    ("AI Desk says it isn't configured", "A maintainer needs to set its key on the portal; not a day-to-day newsroom fix."),
    ("A story won't publish", "It isn't Ready to Publish — finish claims, checklist, and editor approval."),
    ("AI draft won't auto-publish", "It needs both Ready to Publish and a complete dual rating (a human second rating)."),
    ("Published story shows no verified mark", "It was published before the provenance update, or never got a second rating — re-publish."),
    ("ATEM not listed in OBS", "Re-seat the USB-C cable; pick the ATEM in Video Capture Device; quit ATEM Software Control if it's holding the device."),
    ("A camera input is black", "Check HDMI is seated and the camera outputs clean 1080p at the same frame rate; try another ATEM input."),
    ("Graphics don't show in OBS", "Right-click the browser source → Refresh; confirm the correct Program URL (16:9 vs 9:16); confirm you pushed from the portal and have broadcast rights."),
    ("Overlay has a black background", "It isn't in output mode — it must be the OBS browser source (which auto-detects), or add ?output to the URL."),
    ("/live is black or no banner", "Give it 10–20 seconds after Start Streaming and refresh; confirm you pressed Go live."),
    ("Notification didn't arrive", "Confirm the reader allowed notifications, and that they're on a build that includes the push key; test on a real device, not a simulator."),
    ("No audio in OBS", "Unmute the ATEM device in the OBS Audio Mixer; confirm the mic is ON in the ATEM mixer."),
]
for q, a in trb:
    story += [Paragraph(f"<b>{q}</b>", ParagraphStyle("tq", parent=st["body"], textColor=DEEP, spaceAfter=1)),
              Paragraph(a, ParagraphStyle("ta", parent=st["body"], leftIndent=10, spaceAfter=6))]

# ================= 10. MAINTAINER =================
story += [PageBreak(), KICK("SECTION 10"), H1("Maintainer & admin reference")]
story += [P("This section is for whoever maintains the software (the Owner or a technical contact), not day-to-day staff.")]
story += [H3("Configuration (set on the hosting for each project, then redeploy)")]
story += [B("<b>AI Desk</b> — a generation key enables automated drafting."),
          B("<b>Live &amp; video</b> — Cloudflare Stream requires the account id, a Stream API token, and the customer-code (the code only, not the full hostname)."),
          B("<b>News database</b> — the connection the portal writes published content, live state, tips, tokens, and analytics into.")]
story += [H3("Credentials — handle with care")]
story += [B("The broadcast Stream key and all API tokens are secrets. Never commit them or post them publicly."),
          B("If a secret leaks, rotate it (for live, provision a new live input)."),
          B("Staff never enter passwords or payment details into automated tools; those are done by a person directly.")]
story += [H3("App releases (iOS/Android)")]
story += [B("<b>Over-the-air</b>: JavaScript/content changes can ship without an app-store review."),
          B("<b>A new build</b> is needed for anything native — the splash, icon, permissions, or push setup."),
          B("Bump the version before uploading if the current version is already live on the store.")]

# ================= 11. GLOSSARY =================
story += [PageBreak(), KICK("SECTION 11"), H1("Glossary")]
gloss = [
    ("ATEM", "The Blackmagic video switcher that combines the cameras and audio into one feed."),
    ("Bug", "The small on-screen logo/identifier shown during a broadcast."),
    ("Bus", "The server channel that carries graphics from the portal to the OBS overlay."),
    ("D1-4LS", "Dot 1 News's rating framework for reporting; stories are dual-rated against it."),
    ("Dual rating", "A machine rating plus an independent human second rating, reconciled."),
    ("HLS", "The adaptive streaming format used for live and recorded video; plays on any device."),
    ("Lower third", "The name/title graphic across the lower part of the screen."),
    ("OBS", "The software on the studio computer that adds graphics and records/streams."),
    ("OTA", "Over-the-air: shipping a JavaScript app update without an app-store review."),
    ("Provenance", "The mark shown to readers indicating a story was editor-approved and dual-verified."),
    ("Review ladder", "The automatic status a story climbs from Not Verified to Ready to Publish."),
    ("Rundown", "The ordered list of segments for an episode or broadcast."),
    ("Ticker / strap", "The scrolling headline strip (16:9) or headline strap (9:16)."),
]
for term, d in gloss:
    story += [Paragraph(f"<b>{term}</b> — {d}", ParagraphStyle("gl", parent=st["body"], leftIndent=12, firstLineIndent=-12, spaceAfter=5))]

story += [SP(14), box([Paragraph("Dot 1 News · Just Truth, No Bias · A Declared Standpoint", ParagraphStyle("end", parent=st["body"], alignment=TA_CENTER, textColor=DEEP)),
    Paragraph("This manual is regenerated as the system changes. When in doubt, the portal's in-app Guide and the printable handouts hold the current detail.", ParagraphStyle("end2", parent=st["body"], alignment=TA_CENTER, fontSize=8, textColor=MUTED))], bg=HexColor("#f6efe0"), stroke=GOLD)]

def build():
    doc = Manual(PATH)
    doc.multiBuild(story)
    print("Operations Manual:", os.path.getsize(PATH), "bytes")

if __name__ == "__main__":
    build()
