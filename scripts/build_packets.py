#!/usr/bin/env python3
"""Role-specific onboarding packets + a day-one checklist, drawn from the Employee Handbook.
Regenerated with the other docs. Outputs into public/docs/."""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                PageBreak, Table, TableStyle, NextPageTemplate)
from reportlab.lib.styles import ParagraphStyle

CRIMSON = HexColor("#b81616"); DEEP = HexColor("#8f1111"); GOLD = HexColor("#c8a24a")
INK = HexColor("#141210"); MUTED = HexColor("#6b6459"); PAPER = HexColor("#faf7f1")
HAIR = HexColor("#e0d8c8"); GREEN = HexColor("#2f8f6b")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "docs")
os.makedirs(OUT, exist_ok=True)
W, H = letter

body = ParagraphStyle("body", fontName="Helvetica", fontSize=9.8, leading=14.5, textColor=INK, spaceAfter=7)
sty = {
    "body": body,
    "h1": ParagraphStyle("h1", fontName="Times-Bold", fontSize=17, leading=21, textColor=DEEP, spaceBefore=6, spaceAfter=9),
    "h2": ParagraphStyle("h2", fontName="Times-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=12, spaceAfter=5),
    "kick": ParagraphStyle("kick", fontName="Courier", fontSize=8, leading=11, textColor=CRIMSON, spaceAfter=3),
    "bullet": ParagraphStyle("bullet", parent=body, leftIndent=16, bulletIndent=4, spaceAfter=3),
    "num": ParagraphStyle("num", parent=body, leftIndent=18, spaceAfter=4),
    "note": ParagraphStyle("note", parent=body, fontSize=9, textColor=DEEP, leftIndent=10, spaceBefore=3),
    "cover_t": ParagraphStyle("cover_t", fontName="Times-Bold", fontSize=30, leading=34, textColor=HexColor("#f4f0e7"), alignment=TA_CENTER),
    "cover_s": ParagraphStyle("cover_s", fontName="Helvetica", fontSize=13, leading=18, textColor=GOLD, alignment=TA_CENTER),
    "cover_m": ParagraphStyle("cover_m", fontName="Courier", fontSize=9, leading=13, textColor=HexColor("#cfc8ba"), alignment=TA_CENTER),
}
def H1(t): return Paragraph(t, sty["h1"])
def H2(t): return Paragraph(t, sty["h2"])
def P(t): return Paragraph(t, sty["body"])
def KICK(t): return Paragraph(t, sty["kick"])
def NOTE(t): return Paragraph("<b>Note:</b> " + t, sty["note"])
def B(t): return Paragraph(t, sty["bullet"], bulletText="•")
def N(i, t): return Paragraph(f"<b>{i}.</b>&nbsp;&nbsp;" + t, sty["num"])
def SP(h=6): return Spacer(1, h)
def box(flows, bg=PAPER, stroke=HAIR):
    t = Table([[flows]], colWidths=[W - 128 - 20])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.8, stroke),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
    return t

class Packet(BaseDocTemplate):
    def __init__(self, path, label, has_cover=True, **kw):
        super().__init__(path, pagesize=letter, leftMargin=64, rightMargin=64, topMargin=74, bottomMargin=58, **kw)
        self.label = label
        templates = []
        if has_cover:
            templates.append(PageTemplate(id="cover", frames=[Frame(0, 0, W, H, id="c")], onPage=self._cover))
        templates.append(PageTemplate(id="normal", frames=[Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="n")], onPage=self._chrome))
        self.addPageTemplates(templates)
    def _cover(self, c, d):
        c.setFillColor(INK); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(CRIMSON); c.rect(0, H - 250, W, 5, fill=1, stroke=0)
        c.setFillColor(CRIMSON); c.rect(0, 232, W, 5, fill=1, stroke=0)
    def _chrome(self, c, d):
        c.setFillColor(INK); c.setFont("Times-Bold", 9); c.drawString(64, H - 46, "DOT ONE MEDIA")
        c.setFillColor(MUTED); c.setFont("Courier", 7); c.drawRightString(W - 64, H - 46, self.label)
        c.setStrokeColor(HAIR); c.setLineWidth(0.6); c.line(64, H - 54, W - 64, H - 54); c.line(64, 48, W - 64, 48)
        c.setFillColor(MUTED); c.setFont("Courier", 7)
        c.drawString(64, 38, "A Declared Standpoint"); c.drawRightString(W - 64, 38, "Page %d" % d.page)

def cover(title, sub):
    return [Spacer(1, 250), Paragraph("DOT ONE MEDIA", sty["cover_t"]), SP(8),
            Paragraph(title, ParagraphStyle("ct2", parent=sty["cover_t"], fontSize=20, textColor=GOLD)), SP(16),
            Paragraph(sub, sty["cover_s"]), Spacer(1, 120),
            Paragraph("A DECLARED STANDPOINT", sty["cover_m"]),
            Paragraph("Confidential · for Dot One Media staff", sty["cover_m"]),
            NextPageTemplate("normal"), PageBreak()]

def handbook_pointer():
    return box([Paragraph("This is your quick packet. The full <b>Dot One Media Employee Handbook</b> (in the portal Guide, and as a PDF) has every detail; each system also has its own in-app guide.", sty["body"])], bg=HexColor("#f6efe0"), stroke=GOLD)

# ============================ STUDIO / PHOTOGRAPHY ============================
def build_studio():
    s = cover("Studio &amp; Photography Packet", "Running client work: the portal, the assets, the gear")
    s += [KICK("YOUR ROLE"), H1("Running client work")]
    s += [P("You run client jobs — photography, video, music, and government work — through the <b>client portal</b>, and you track the gear behind them in the <b>asset system</b>. This packet is your day-to-day; depth is in the full handbook.")]
    s += [H2("Signing in")]
    s += [P("Use your <b>@dot1.media</b> studio account at <b>portal.dot1.media</b>. That one sign-in also opens the asset system at <b>assets.dot1.media</b> automatically. Signing out of one signs you out of both.")]
    s += [H2("The client portal — the studio side")]
    s += [B("<b>Status timeline</b> — every job is a session moving through 7 stages: scheduling → booked → day-of → post-shoot → editing → pre-delivery → final delivery. Advance it as you go; choose whether to email the client at each step."),
          B("<b>Getting a job in</b> — client self-booking; internal booking (studio-only quick booking for mini sessions, email-only, no client account); an invoice (a bill that books the job); or importing past sessions from an Acuity CSV."),
          B("<b>Services &amp; add-ons</b> — session types by group (Photography, Video, Music, Government), each with an optional example image and an attached gear package."),
          B("<b>Payments</b> — Square. Video 50% retainer; photography full or half; music/government by quote. Receipts are emailed PDFs; the home page shows a Pending payment panel; Check / Sync re-queries Square."),
          B("<b>Invoices</b> — create, preview, and send a branded invoice with a retainer pay link; the client then signs agreements and sets a password. Sent invoices are archived."),
          B("<b>Delivery</b> — paste the gallery link (photos, via CloudSpot) or video link; a confirmation asks you to verify before the client is emailed. Final delivery invites a Google review."),
          B("<b>Messaging</b> — a two-way client thread (images supported), with a notification bell."),
          B("<b>Client Accounts</b> — look a client up by email to reset a password or change their login email."),
          B("<b>Analytics</b> (Business Settings) — revenue by service line, bookings by type, and by month.")]
    s += [NOTE("Photography routes to the Creative Director; video, music, and government route to the founder.")]
    s += [H2("What your client sees")]
    s += [P("Clients book, sign, and pay in one flow, then sign in to watch their session's status timeline, message you, pay a balance, receive the gallery or video link, and leave a review. They see only their own sessions.")]
    s += [H2("The asset system")]
    s += [B("<b>Dashboard</b> — total value, counts, and a lifecycle attention list."),
          B("<b>Inventory</b> — searchable table of equipment, software, and services; add/edit/delete; shows what's checked out."),
          B("<b>Lifecycle</b> — items by urgency; fill in purchase dates + lifespans (equipment) and renewal dates (software/services) so alerts work."),
          B("<b>Packages</b> and <b>Checked Out</b> — see gear packages below.")]
    s += [H2("Gear packages")]
    s += [N(1, "Build a package (a kit of gear) in the asset system's Packages tab."),
          N(2, "Attach it to a session type in the portal (Services &amp; Add-ons)."),
          N(3, "Check it out for a shoot with a due-back date; check it in on return. Inventory shows what's out; overdue kits are flagged.")]
    s += [H2("Your runbooks")]
    s += [B("<b>Book a client</b>: Sessions → New internal booking (or send an invoice) → enter details → create."),
          B("<b>Send an invoice</b>: Sessions → New invoice → service + add-ons → preview → send; client pays retainer, signs, sets password."),
          B("<b>Deliver</b>: advance to delivery → paste gallery/video link → confirm the send."),
          B("<b>Gear</b>: Assets → Checked Out → check the package out with a due date; check in after the shoot.")]
    s += [H2("If something's off")]
    s += [B("Can't open assets → sign in at the portal first."),
          B("A payment didn't show → use Check / Sync."),
          B("A client email didn't land → copy the link from the session and send it another way; have the email domain settings checked."),
          B("A change didn't appear → hard-refresh the page twice (the portal caches)."),
          B("Gear shows out but isn't → check it in from Checked Out.")]
    s += [SP(8), handbook_pointer()]
    d = Packet(os.path.join(OUT, "Dot1Media-Packet-Studio.pdf"), "STUDIO PACKET")
    d.title = "Dot One Media — Studio & Photography Packet"; d.build(s)

# ============================ REPORTER ============================
def build_reporter():
    s = cover("Reporter Packet", "Writing and verifying the news, to standard")
    s += [KICK("YOUR ROLE"), H1("Reporting for Dot 1 News")]
    s += [P("You create and work stories — the reporting, the record behind it, and the verification. You do not publish; an editor approves and publishes. Our standard is <b>Just Truth, No Bias</b>, and the system enforces it: a story can't skip verification.")]
    s += [H2("Signing in")]
    s += [P("The newsroom has its own login at <b>editorial.dot1.media</b> (separate from the studio sign-in). An Owner sets up your account and your Reporter role.")]
    s += [H2("Where you fit")]
    s += [P("As a <b>Reporter</b> you can create and work stories: manage sources and evidence, add to the reporting log, work verification, and add a rating. Assigning, approving, and publishing are the Editor's; anything you can't see is gated to a role you don't have.")]
    s += [H2("The life of a story")]
    s += [B("<b>Origin</b> — you write it, the AI Desk drafts it from the wire (a starting point, never published as-is), or it's promoted from a public tip."),
          B("<b>Sources</b> — who and what the story rests on."),
          B("<b>Evidence</b> — documents, links, and files that back specific claims."),
          B("<b>Reporting log</b> — a timestamped record of what you did (calls, records). This is how we show our work."),
          B("<b>Verification</b> — the checklist and per-claim checks that move the story up the ladder.")]
    s += [H2("The review ladder (automatic)")]
    s += [N(1, "Not Verified"), N(2, "Partially Verified"), N(3, "Verified"), N(4, "Editor Approved"), N(5, "Ready to Publish")]
    s += [P("Status is computed from the work done — you don't set it by hand.")]
    s += [H2("Scoring")]
    s += [P("Every story is <b>dual-rated</b> — a machine rating plus an independent human second rating, reconciled. Add your second rating on the Score tab; where the newsroom expects independence, don't be the second rater on your own draft. Dual-rated stories carry a verified mark to readers.")]
    s += [H2("Tips")]
    s += [P("Public tips (from the app and both websites) arrive in the Tips queue. Review them and promote worthwhile ones into stories. Some are anonymous — protect confidentiality.")]
    s += [H2("Standards & corrections")]
    s += [P("Our public editorial standards and the correction ledger are maintained by editors. When we get something wrong, it's corrected on the record. Readers see whether a story was editor-approved and dual-verified.")]
    s += [H2("Your runbook — publishing a story")]
    s += [N(1, "Complete sources, evidence, and the reporting log."),
          N(2, "Work verification until the ladder reaches Verified."),
          N(3, "Add the independent second rating."),
          N(4, "Hand off to an editor, who approves and publishes.")]
    s += [H2("If something's off")]
    s += [B("A story won't advance → finish the claims and checklist; the ladder is automatic."),
          B("A page or button is missing → it's gated to a higher role; ask an Owner."),
          B("The AI Desk says it isn't configured → a maintainer sets its key; not a newsroom fix.")]
    s += [SP(8), handbook_pointer()]
    d = Packet(os.path.join(OUT, "Dot1Media-Packet-Reporter.pdf"), "REPORTER PACKET")
    d.title = "Dot One Media — Reporter Packet"; d.build(s)

# ============================ PRODUCER ============================
def build_producer():
    s = cover("Producer Packet", "Running the broadcast: graphics, episodes, live")
    s += [KICK("YOUR ROLE"), H1("Producing the broadcast")]
    s += [P("You run the studio: the on-air graphics, recorded episodes, and going live. This packet is the hands-on version; the handbook and the printable Live Broadcast Guide have the full detail.")]
    s += [H2("Signing in")]
    s += [P("Use your newsroom login at <b>editorial.dot1.media</b>; you need broadcast permission (Producer or Owner) to drive graphics, publish episodes, and go live.")]
    s += [H2("Equipment & signal flow")]
    s += [P("The chain: <b>Cameras → ATEM switcher → OBS (adds graphics) → recording or live stream</b>. Graphics reach OBS from the portal.")]
    s += [B("Cameras (Canon C50 / C400) → HDMI into ATEM inputs 1–4."),
          B("ATEM Mini Pro ISO switches cameras and mixes audio; one USB-C cable carries the program to the computer as a webcam."),
          B("A mic goes into the ATEM's 3.5&nbsp;mm input; OBS takes the ATEM feed and adds the overlay.")]
    s += [box([NOTE("Cameras, ATEM, and OBS must all run the same frame rate (all 1080p 30, or all 60).")])]
    s += [H2("Cameras, audio, ATEM")]
    s += [B("Cameras: clean HDMI output on, all 1920×1080 same frame rate, subjects near centre for the 9:16 crop."),
          B("Audio: mic into the ATEM, host mic ON, peaks around −12 to −6&nbsp;dB (red is clipping)."),
          B("ATEM: Program buttons pick what's live (CUT hard-cuts, AUTO transitions); optional USB-C SSD ISO-records each input.")]
    s += [H2("OBS — 16:9 and 9:16")]
    s += [B("16:9: ATEM as a Video Capture Device (1920×1080) + the overlay Browser Source (Program URL from Broadcast → Live tools) placed above the camera; it runs transparent automatically."),
          B("9:16: a separate OBS profile at 1080×1920, the ATEM cropped to a centre 9:16, and the vertical overlay on top. Same graphics drive both; the ticker shows as a headline strap on vertical.")]
    s += [H2("On-air graphics (from the portal)")]
    s += [B("Lower thirds: Broadcast → a rundown segment → Take to air; Clear removes it."),
          B("Bug, ticker, breaking: Broadcast → On-air graphics → Show / Hide; edit the ticker and Update."),
          B("Pushes appear on the OBS overlay within about a second, on both outputs.")]
    s += [H2("Recorded episodes (DaVinci → publish)")]
    s += [N(1, "Record (OBS or ATEM ISO), then edit and colour in DaVinci; export 1080p."),
          N(2, "Broadcast → Publish episode; add title, description, category, host."),
          N(3, "Drop in the file; Upload &amp; publish (or draft). It encodes and appears in the app and site.")]
    s += [H2("Going live")]
    s += [N(1, "Broadcast → Go live → Set up live input (once); copy the OBS Server URL and Stream key."),
          N(2, "OBS: Settings → Stream → Custom; paste them; Start Streaming."),
          N(3, "In the portal, press Go live with a title; the LIVE surface appears and a notification goes out."),
          N(4, "End broadcast when done; the recording is kept.")]
    s += [box([NOTE("The Stream key is a credential — never paste it publicly. Normal: a 10–20s beat before playable, and a short delay behind real time.")])]
    s += [H2("Notifications")]
    s += [B("Going live and publishing an episode notify readers automatically."),
          B("Use Send Alert for breaking news (preview + confirm).")]
    s += [H2("Before every broadcast — dry run")]
    s += [N(1, "Cameras clean + same frame rate, into ATEM 1–4; audio ON, no clipping."),
          N(2, "OBS: ATEM as capture device; overlay on top; audio in the mixer."),
          N(3, "Portal: Show the bug → confirm in OBS → Hide; Take a lower third → confirm → Clear."),
          N(4, "Record a 60-second test while switching cameras and pushing graphics; review it.")]
    s += [SP(8), handbook_pointer()]
    d = Packet(os.path.join(OUT, "Dot1Media-Packet-Producer.pdf"), "PRODUCER PACKET")
    d.title = "Dot One Media — Producer Packet"; d.build(s)

# ============================ DAY ONE CHECKLIST ============================
def build_dayone():
    def checkrow(t):
        cb = Table([[""]], colWidths=[12], rowHeights=[12])
        cb.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 1, HexColor("#b9b0a0"))]))
        r = Table([[cb, Paragraph(t, sty["body"])]], colWidths=[22, W - 128 - 22])
        r.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (0, 0), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        return r
    s = [KICK("NEW HIRE · DAY ONE"), H1("Getting started at Dot One Media"),
         P("Welcome. Work top to bottom on your first day. Your role packet and the full Employee Handbook have the how-to; this is the checklist to get set up and oriented.")]
    s += [H2("Set up")]
    for t in ["Get your account from an Owner/studio and your role confirmed.",
              "Studio staff: sign in at portal.dot1.media (it also opens assets.dot1.media).",
              "Newsroom staff: sign in at editorial.dot1.media.",
              "Confirm you can see what your role should, and note anything missing to ask about."]:
        s += [checkrow(t)]
    s += [H2("Read")]
    for t in ["Read your role packet (Studio & Photography, Reporter, or Producer).",
              "Skim the Employee Handbook — especially the section for your work.",
              "Open the in-app guide in whatever system you'll use most."]:
        s += [checkrow(t)]
    s += [H2("Know the addresses")]
    for t in ["dot1.media — the public company site.",
              "portal.dot1.media — client jobs (studio + clients).",
              "assets.dot1.media — gear and lifecycle.",
              "editorial.dot1.media — the newsroom.",
              "news.dot1.media + the Dot 1 News app — what readers see."]:
        s += [checkrow(t)]
    s += [H2("Understand how we work")]
    for t in ["Access is by role — you'll see only what your role allows.",
              "We do the work to a standard and keep a record; the systems enforce it.",
              "Never share your login or enter passwords/payment details into an automated tool.",
              "Protect client and tipster confidentiality."]:
        s += [checkrow(t)]
    s += [H2("Your first tasks")]
    for t in ["Ask your lead for one real task in your main system and do it end to end.",
              "Find the runbook for it in your packet and follow it.",
              "Note anything confusing — that's how the guides improve."]:
        s += [checkrow(t)]
    s += [SP(10), box([Paragraph("Questions? Ask an Owner (newsroom) or the studio. Welcome to the team.", ParagraphStyle("w", parent=sty["body"], alignment=TA_CENTER, textColor=DEEP))], bg=HexColor("#f6efe0"), stroke=GOLD)]
    d = Packet(os.path.join(OUT, "Dot1Media-DayOne-Checklist.pdf"), "DAY ONE", has_cover=False)
    d.title = "Dot One Media — Day One Checklist"; d.build(s)

def build():
    build_studio(); build_reporter(); build_producer(); build_dayone()
    print("Packets built.")

if __name__ == "__main__":
    build()
