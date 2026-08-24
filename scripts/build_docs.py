#!/usr/bin/env python3
"""Build the printable Dot 1 News handouts into public/docs so they're always
current and downloadable from the portal. Regenerate on every docs push:

    python3 scripts/build_docs.py

Outputs:
    public/docs/Dot1News-Newsroom-QuickStart.pdf
    public/docs/Dot1News-Broadcast-Guide.pdf
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor

W, H = letter
CRIMSON = HexColor("#b81616"); DEEP = HexColor("#8f1111")
GOLD = HexColor("#c8a24a"); INK = HexColor("#141210")
BONE = HexColor("#f4f0e7"); PAPER = HexColor("#fbf8f2"); MUTED = HexColor("#6b6459")
BLUE = HexColor("#3a6ea5"); GREEN = HexColor("#2f8f6b")

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "docs")
os.makedirs(OUT, exist_ok=True)


class Doc:
    def __init__(self, path, title):
        self.c = canvas.Canvas(path, pagesize=letter); self.c.setTitle(title)

    def rrect(self, x, y, w, h, r=6, fill=None, stroke=None, sw=1):
        c = self.c
        if fill is not None: c.setFillColor(fill)
        if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(sw)
        c.roundRect(x, y, w, h, r, stroke=1 if stroke is not None else 0, fill=1 if fill is not None else 0)

    def txt(self, x, y, s, size=9, font="Helvetica", color=INK, center=False, right=False):
        c = self.c; c.setFillColor(color); c.setFont(font, size)
        if center: c.drawCentredString(x, y, s)
        elif right: c.drawRightString(x, y, s)
        else: c.drawString(x, y, s)

    def pill(self, x, y, label, color):
        c = self.c; c.setFont("Helvetica-Bold", 6.5)
        w = c.stringWidth(label, "Helvetica-Bold", 6.5) + 10
        c.setFillColor(HexColor("#ffffff")); c.setStrokeColor(color); c.setLineWidth(0.8)
        c.roundRect(x, y, w, 11, 5.5, stroke=1, fill=0)
        c.setFillColor(color); c.drawCentredString(x + w / 2, y + 3, label)
        return w + 4

    def roles(self, x, y, roles):
        cx = x
        for r, col in roles: cx += self.pill(cx, y, r, col)
        return cx

    def header(self, deck, sub):
        c = self.c
        c.setFillColor(INK); c.rect(0, H - 92, W, 92, fill=1, stroke=0)
        c.setFillColor(CRIMSON); c.rect(0, H - 96, W, 4, fill=1, stroke=0)
        self.txt(54, H - 46, "DOT 1 NEWS", 22, "Times-Bold", BONE)
        self.txt(56, H - 62, "JUST TRUTH  \u00b7  NO BIAS", 8, "Courier", GOLD)
        self.txt(W - 54, H - 44, deck, 15, "Times-Bold", BONE, right=True)
        self.txt(W - 54, H - 60, sub, 8.5, "Helvetica", HexColor("#cfc8ba"), right=True)

    def footer(self):
        self.txt(54, 40, "Dot 1 News \u00b7 A Declared Standpoint", 7.5, "Courier", MUTED)
        self.txt(W - 54, 40, "Full guide: editorial.dot1.media \u2192 Guide", 7.5, "Courier", MUTED, right=True)

    def kicker(self, x, y, s):
        self.txt(x, y, s, 9, "Courier", CRIMSON)

    def arrow(self, x1, y, x2):
        c = self.c; c.setStrokeColor(GOLD); c.setLineWidth(1.6); c.line(x1, y, x2 - 4, y)
        c.setFillColor(GOLD); p = c.beginPath(); p.moveTo(x2, y); p.lineTo(x2 - 5, y + 3); p.lineTo(x2 - 5, y - 3); p.close(); c.drawPath(p, fill=1, stroke=0)

    def rows(self, x, y, wdt, items, rh=30, box=24):
        """items: (title, desc, roles|None)"""
        for name, desc, roles in items:
            self.rrect(x, y - (box - 8), wdt, box, 5, fill=PAPER, stroke=HexColor("#e7dfce"), sw=0.8)
            self.txt(x + 10, y + 1, name, 9, "Helvetica-Bold", INK)
            self.txt(x + 10, y - 9, desc, 7.4, "Helvetica", MUTED)
            if roles: self.roles(x + wdt - 190, y - 4, roles)
            y -= rh
        return y

    def bullets(self, x, y, items, lead=13, size=8.4, wrapw=None):
        for b in items:
            self.c.setFillColor(GOLD); self.c.circle(x + 2, y + 3, 1.6, fill=1, stroke=0)
            self.txt(x + 10, y, b, size, "Helvetica", INK)
            y -= lead
        return y

    def save(self): self.c.save()


OWN = ("Owner", GOLD); ED = ("Editor", CRIMSON); REP = ("Reporter", BLUE); PRO = ("Producer", GREEN)

# ============================================================ QUICK START
def build_quickstart():
    d = Doc(os.path.join(OUT, "Dot1News-Newsroom-QuickStart.pdf"), "Dot 1 News \u2014 Newsroom Quick Start")
    d.header("Newsroom Quick Start", "How content reaches readers")
    y = H - 150; d.kicker(54, y + 34, "THE FLOW")
    steps = [("Where it starts", ["Reporter", "AI Desk", "Tip"]), ("Review", ["claims", "checklist", "editor OK"]),
             ("Dual-rate", ["AI + human", "score"]), ("Publish", ["to news DB"]), ("Readers", ["news.dot1.media", "the app"])]
    bw, gap, x = 92, 21, 54
    for i, (label, lines) in enumerate(steps):
        last = i == 4
        d.rrect(x, y - 30, bw, 56, 6, fill=HexColor("#f6efe0") if last else PAPER, stroke=GOLD if last else HexColor("#ddd4c4"), sw=1.2 if last else 1)
        d.txt(x + bw / 2, y + 12, label, 8.5, "Helvetica-Bold", DEEP if last else INK, center=True)
        for j, ln in enumerate(lines): d.txt(x + bw / 2, y - 2 - j * 10, ln, 6.8, "Helvetica", MUTED, center=True)
        if not last: d.arrow(x + bw + 3, y - 2, x + bw + gap - 4)
        x += bw + gap
    y = H - 250; d.kicker(54, y, "WHO DOES WHAT")
    tasks = [
        ("Create & report a story", "Sources, evidence, notes, verification, script.", [REP, ED, OWN]),
        ("Generate drafts (AI Desk)", "Pull the wire, auto-write & score; lands in Verification.", [REP, ED, OWN]),
        ("Triage tips \u2192 promote", "Public tips from app & sites become stories.", [REP, ED, OWN]),
        ("Verify & climb the ladder", "Handle claims + checklist; status is computed.", [REP, ED, OWN]),
        ("Approve for publication", "Editor sign-off lifts a story to Ready to Publish.", [ED, OWN]),
        ("Score \u2014 add 2nd rating", "Human second rater on the Score tab; reconciled.", [REP, ED, OWN]),
        ("Publish", "Ready stories go live; AI stories auto-publish.", [ED, OWN]),
        ("Manage live content", "Edit article; delete article/media (immediate).", [REP, ED, OWN]),
        ("On-air graphics", "Bug, ticker, breaking, lower thirds \u2192 OBS.", [PRO, OWN]),
        ("Standards, corrections, audit", "Public policy edits; correction ledger; audit log.", [ED, OWN]),
    ]
    y = d.rows(54, y - 16, W - 108, tasks)
    y -= 6; d.kicker(54, y, "THE REVIEW LADDER  (computed automatically)"); y -= 18
    ladder = ["Not Verified", "Partially Verified", "Verified", "Editor Approved", "Ready to Publish"]
    d.c.setStrokeColor(HexColor("#ddd4c4")); d.c.setLineWidth(1.5); d.c.line(74, y, W - 90, y)
    seg = (W - 90 - 74) / 4
    for i, s in enumerate(ladder):
        lx = 74 + i * seg; last = i == 4
        d.c.setFillColor(GOLD if last else HexColor("#c9c0b0")); d.c.circle(lx, y, 4.5 if last else 3.2, fill=1, stroke=0)
        d.txt(lx, y + 9, s, 6.8, "Helvetica-Bold" if last else "Helvetica", DEEP if last else MUTED, center=True)
    d.footer(); d.c.showPage()

    d.header("Newsroom Quick Start", "When something looks wrong")
    y = H - 140; d.kicker(54, y, "TROUBLESHOOTING"); y -= 20
    tbl = [
        ("AI Desk says \u201cnot configured\u201d", "Generation key isn't set on hosting. A maintainer adds it."),
        ("AI draft won't auto-publish", "Needs BOTH: Ready to Publish AND a complete dual-rate (2nd human rating)."),
        ("Published story shows no gold mark", "Published before the provenance update, or never got a 2nd rating. Re-publish."),
        ("Graphics don't show in OBS", "Hard-refresh the OBS browser source; confirm it points at the overlay output."),
        ("A story won't publish", "It isn't Ready to Publish \u2014 finish claims, checklist, editor approval."),
        ("A page or button is missing", "It's gated to your role. Ask an Owner to grant it in Accounts."),
        ("Published edit/delete unavailable", "News-database connection isn't set on hosting. A maintainer configures it."),
        ("Tips aren't arriving", "Confirm the sending site points at the tip endpoint; arrivals show in Tips."),
    ]
    for q, a in tbl:
        d.rrect(54, y - 22, W - 108, 34, 5, fill=PAPER, stroke=HexColor("#e7dfce"), sw=0.8)
        d.txt(64, y - 2, q, 9, "Helvetica-Bold", DEEP); d.txt(64, y - 14, a, 8, "Helvetica", INK); y -= 40
    y -= 4; d.kicker(54, y, "ROLES AT A GLANCE"); y -= 20
    legend = [("Owner", GOLD, "Everything, and grants access to others. Cannot be locked out."),
              ("Editor", CRIMSON, "Reviews, approves, publishes; corrections, standards, audit."),
              ("Reporter", BLUE, "Creates & works stories: sources, evidence, verification, ratings."),
              ("Producer", GREEN, "Runs the broadcast and on-air graphics."),
              ("Viewer", MUTED, "Reads the newsroom without changing anything.")]
    for name, col, desc in legend:
        d.pill(54, y - 2, name, col); d.txt(130, y, desc, 8.5, "Helvetica", INK); y -= 20
    y -= 4; d.rrect(54, y - 30, W - 108, 34, 5, fill=HexColor("#f6efe0"), stroke=GOLD, sw=1)
    d.txt(64, y - 8, "Access is by capability.", 8.5, "Helvetica-Bold", DEEP)
    d.txt(64, y - 20, "An Owner can grant any single ability to any person from Accounts, regardless of role.", 8.5, "Helvetica", INK)
    d.footer(); d.c.showPage(); d.save()


# ============================================================ BROADCAST GUIDE
def build_broadcast():
    d = Doc(os.path.join(OUT, "Dot1News-Broadcast-Guide.pdf"), "Dot 1 News \u2014 Live Broadcast Guide")

    # ---- Page 1: signal flow + what you're building ----
    d.header("Live Broadcast Guide", "ATEM + OBS + Editorial \u2014 setup & run")
    y = H - 148; d.kicker(54, y + 30, "THE SIGNAL FLOW")
    chain = [("Cameras", ["C50 / C400", "clean HDMI"]), ("ATEM Mini Pro ISO", ["switch", "+ audio"]),
             ("OBS", ["adds graphics", "record/stream"]), ("Audience", ["stream", "or recording"])]
    bw, gap, x = 116, 26, 54
    for i, (label, lines) in enumerate(chain):
        last = i == 3
        d.rrect(x, y - 30, bw, 56, 6, fill=HexColor("#f6efe0") if last else PAPER, stroke=GOLD if last else HexColor("#ddd4c4"), sw=1.2 if last else 1)
        d.txt(x + bw / 2, y + 12, label, 8.7, "Helvetica-Bold", DEEP if last else INK, center=True)
        for j, ln in enumerate(lines): d.txt(x + bw / 2, y - 2 - j * 10, ln, 6.9, "Helvetica", MUTED, center=True)
        if not last: d.arrow(x + bw + 4, y - 2, x + bw + gap - 3)
        x += bw + gap
    # graphics side-channel
    y2 = y - 66
    d.rrect(54, y2 - 24, 200, 30, 6, fill=HexColor("#f6efe0"), stroke=GOLD, sw=1)
    d.txt(64, y2 - 4, "Editorial portal", 9, "Helvetica-Bold", DEEP)
    d.txt(64, y2 - 15, "On-air graphics + rundown", 7.2, "Helvetica", MUTED)
    d.arrow(258, y2 - 9, 300)
    d.rrect(304, y2 - 24, 150, 30, 6, fill=PAPER, stroke=HexColor("#ddd4c4"))
    d.txt(314, y2 - 4, "the bus", 9, "Helvetica-Bold", INK); d.txt(314, y2 - 15, "server channel", 7.2, "Helvetica", MUTED)
    d.arrow(458, y2 - 9, 500)
    d.rrect(504, y2 - 24, 54, 30, 6, fill=PAPER, stroke=HexColor("#ddd4c4"))
    d.txt(531, y2 - 12, "OBS", 9, "Helvetica-Bold", INK, center=True)
    d.txt(54, y2 - 42, "Graphics you push in the portal travel through a server \u201cbus\u201d that the OBS browser source polls,", 8.6, "Helvetica", INK)
    d.txt(54, y2 - 54, "so they appear on the OBS overlay within about a second. OBS runs its own browser and can't share", 8.6, "Helvetica", INK)
    d.txt(54, y2 - 66, "yours \u2014 the bus is the bridge. You never paste graphics into OBS by hand.", 8.6, "Helvetica", INK)

    y = y2 - 96; d.kicker(54, y, "WHAT EACH PIECE DOES"); y -= 8
    d.rows(54, y - 8, W - 108, [
        ("The cameras (C50 / C400)", "Send a clean 1080p picture over HDMI into the switcher.", None),
        ("The ATEM Mini Pro ISO", "Switches between cameras and mixes audio; sends one feed to the computer over USB-C.", None),
        ("OBS", "Takes the ATEM feed, lays the Dot 1 News graphics on top, and records or streams it.", None),
        ("The editorial portal", "Where a producer drives lower thirds, the bug, ticker, and breaking \u2014 live.", None),
    ], rh=30, box=24)
    d.footer(); d.c.showPage()

    # ---- Page 2: cameras, audio, ATEM ----
    d.header("Live Broadcast Guide", "Cameras \u00b7 Audio \u00b7 Switcher")
    y = H - 138
    d.kicker(54, y, "CAMERAS \u2014 CANON C50 / C400"); y -= 18
    y = d.bullets(54, y, [
        "Turn on CLEAN HDMI output so menus, focus guides, and info don't show on air (Canon HDMI output / display-off setting).",
        "Set every camera to the SAME resolution and frame rate: 1920x1080 at 30p (or all 60p). Never mix frame rates.",
        "Run each camera's HDMI into ATEM inputs 1\u20134. Seat the connectors firmly; a locking HDMI adapter helps on a live set.",
        "Optional: let each camera also record locally as a backup while it feeds the switcher.",
    ], lead=16)
    y -= 10; d.kicker(54, y, "AUDIO"); y -= 18
    y = d.bullets(54, y, [
        "Simplest path: plug your host mic into the ATEM's 3.5mm audio input and set its level on the ATEM.",
        "Or use camera audio embedded in the HDMI feed if the mic is on the camera.",
        "In the ATEM audio mixer, set the host mic to ON (always on). Use AFV (audio-follows-video) for sources that should only be heard when live.",
        "Watch levels: aim for peaks around -12 to -6 dB. If it hits red (0 dB) it's clipping \u2014 turn it down.",
    ], lead=16)
    y -= 10; d.kicker(54, y, "ATEM MINI PRO ISO"); y -= 18
    y = d.bullets(54, y, [
        "Connect: cameras to HDMI IN 1\u20134; USB-C from the ATEM to the computer (it appears as a webcam); optional HDMI OUT to a monitor for multiview.",
        "Switch: the Program row buttons pick what's live. CUT is a hard cut; AUTO runs the selected transition at the set rate.",
        "Optional ISO record: plug a fast USB-C SSD into the ATEM to record every input separately for editing in Resolve later.",
        "The ATEM Software Control app gives deeper audio, media, and macro settings \u2014 not required for a first test.",
    ], lead=16)
    y -= 8
    d.rrect(54, y - 34, W - 108, 40, 6, fill=HexColor("#f6efe0"), stroke=GOLD, sw=1)
    d.txt(64, y - 10, "One rule that prevents most problems:", 9, "Helvetica-Bold", DEEP)
    d.txt(64, y - 23, "Cameras, ATEM, and OBS should all be the same frame rate. Mixed frame rates cause stutter and sync drift.", 8.6, "Helvetica", INK)
    d.footer(); d.c.showPage()

    # ---- Page 3: OBS + editorial integration ----
    d.header("Live Broadcast Guide", "OBS \u00b7 Editorial graphics")
    y = H - 138
    d.kicker(54, y, "OBS \u2014 BRING IN THE SWITCHER"); y -= 18
    y = d.bullets(54, y, [
        "Add the ATEM feed: Sources \u2192 + \u2192 Video Capture Device \u2192 pick the Blackmagic ATEM. Set it to 1920x1080.",
        "Set the canvas: Settings \u2192 Video \u2192 Base and Output resolution 1920x1080, FPS matching your cameras.",
        "Confirm audio: the ATEM's audio arrives with that capture device \u2014 check it shows and moves in the Audio Mixer.",
    ], lead=16)
    y -= 10; d.kicker(54, y, "OBS \u2014 ADD THE DOT 1 NEWS OVERLAY"); y -= 18
    y = d.bullets(54, y, [
        "Sources \u2192 + \u2192 Browser Source. URL: the Program URL from Broadcast \u2192 Live tools",
        "     https://editorial.dot1.media/broadcast/dot1-news-broadcast.html",
        "Width 1920, Height 1080. Leave \u201cShutdown source when not visible\u201d OFF.",
        "Drag the overlay ABOVE the ATEM source so graphics sit on top of the picture.",
        "The overlay detects OBS and runs transparent automatically \u2014 no green screen, no extra settings.",
    ], lead=15)
    y -= 10; d.kicker(54, y, "EDITORIAL \u2014 DRIVE THE GRAPHICS (from the portal, not OBS)"); y -= 18
    y = d.bullets(54, y, [
        "Lower thirds: Broadcast \u2192 open an episode's rundown \u2192 a segment \u2192 Take to air (Clear removes it).",
        "Bug, ticker, breaking: Broadcast \u2192 On-air graphics \u2192 Show / Hide. Edit the ticker text and press Update.",
        "Anything you push appears on the OBS overlay within ~1 second. You control it from the portal; OBS just displays it.",
        "You need broadcast permissions (Producer or Owner) to push graphics.",
        "Grab the exact URLs any time from Broadcast \u2192 Live tools (Program URL for OBS, Control URL for an optional dock).",
    ], lead=15)
    d.footer(); d.c.showPage()

    # ---- Page 4: dry-run checklist + troubleshooting ----
    d.header("Live Broadcast Guide", "Friday dry-run \u00b7 Troubleshooting")
    y = H - 138
    d.kicker(54, y, "PRE-FLIGHT, IN ORDER"); y -= 18
    checks = [
        "Cameras: clean HDMI on, all the same 1080p frame rate, plugged into ATEM 1\u20134.",
        "Audio: mic into the ATEM, level set, mixer channel ON, no red clipping.",
        "ATEM: USB-C to the computer. Cut through inputs and confirm every camera shows.",
        "OBS: ATEM added as Video Capture Device (1080p); overlay Browser Source on top (Program URL, 1920x1080); audio visible in the mixer.",
        "Portal: sign in \u2192 Broadcast \u2192 On-air graphics. Show the bug \u2192 confirm it appears in OBS \u2192 Hide it.",
        "Lower third: open a rundown segment \u2192 Take \u2192 confirm on the OBS overlay \u2192 Clear.",
        "Ticker + breaking: Show each \u2192 confirm \u2192 Hide.",
        "Record a 60-second test: switch cameras on the ATEM while pushing a lower third and ticker. Stop and review.",
        "If streaming: put the stream key in OBS and go live to a private/test target first.",
    ]
    for i, ch in enumerate(checks):
        d.rrect(54, y - 4, 12, 12, 3, fill=None, stroke=HexColor("#b9b0a0"), sw=1)
        d.txt(74, y, ch, 8.4, "Helvetica", INK); y -= 18
    y -= 8; d.kicker(54, y, "TROUBLESHOOTING"); y -= 18
    tbl = [
        ("ATEM not listed in OBS", "Re-seat USB-C; pick the ATEM in Video Capture Device; quit ATEM Software Control if it's holding the device."),
        ("A camera input is black", "Check HDMI is seated and the camera outputs clean 1080p at the same fps; try another ATEM input."),
        ("Graphics don't show in OBS", "Right-click the browser source \u2192 Refresh; confirm the URL is the Program URL; confirm you pushed from the portal and have broadcast rights."),
        ("Graphics won't update", "Source is cached \u2014 Refresh it; confirm On-air graphics shows \u201cOn air\u201d after you press Show."),
        ("Overlay has a black background", "It's not in output mode \u2014 it must be the OBS browser source (auto), or add ?output to the URL."),
        ("No audio in OBS", "Unmute the ATEM device in the OBS Audio Mixer; confirm the mic is ON in the ATEM mixer."),
        ("Stutter or lag", "Match frame rates across cameras, ATEM, and OBS; use a fast USB port; close other heavy apps."),
    ]
    for q, a in tbl:
        d.rrect(54, y - 22, W - 108, 34, 5, fill=PAPER, stroke=HexColor("#e7dfce"), sw=0.8)
        d.txt(64, y - 2, q, 8.8, "Helvetica-Bold", DEEP); d.txt(64, y - 13, a, 7.7, "Helvetica", INK); y -= 39
    d.footer(); d.c.showPage(); d.save()


if __name__ == "__main__":
    build_quickstart()
    build_broadcast()
    print("Built:", os.listdir(OUT))
