#!/usr/bin/env python3
"""Federal-readiness business deliverables: capability statement + SDVOSB contracting starter.
Output to ops-docs/ (gitignored); delivered as files. Run: python3 scripts/build_business.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_packets import (Packet, sty, cover, H1, H2, P, KICK, NOTE, B, N, SP, box,
                           HexColor, TA_CENTER, Paragraph, Table, TableStyle, ParagraphStyle,
                           DEEP, GOLD, PAPER, HAIR, INK, MUTED, CRIMSON, W)

OUT = os.path.join(os.path.dirname(__file__), "..", "ops-docs")
os.makedirs(OUT, exist_ok=True)

# ============================ CAPABILITY STATEMENT (one page) ============================
def build_capability():
    bone = HexColor("#f4f0e7")
    lab = ParagraphStyle("lab", fontName="Courier", fontSize=7.4, leading=10, textColor=MUTED)
    val = ParagraphStyle("val", fontName="Helvetica-Bold", fontSize=8.2, leading=11, textColor=INK)
    ctitle = ParagraphStyle("ctitle", fontName="Times-Bold", fontSize=11, leading=13, textColor=DEEP, spaceBefore=2, spaceAfter=4)
    citem = ParagraphStyle("citem", fontName="Helvetica", fontSize=8.6, leading=12, textColor=INK, leftIndent=10, bulletIndent=2, spaceAfter=2)
    cbody = ParagraphStyle("cbody", fontName="Helvetica", fontSize=8.6, leading=12.5, textColor=INK, spaceAfter=4)

    def bullet(t): return Paragraph(t, citem, bulletText="•")

    # Header band
    header = Table([[Paragraph("DOT ONE MEDIA", ParagraphStyle("h", fontName="Times-Bold", fontSize=22, textColor=bone)),
                     Paragraph("CAPABILITY<br/>STATEMENT", ParagraphStyle("h2", fontName="Courier", fontSize=9, leading=12, textColor=GOLD, alignment=2))]],
                    colWidths=[330, 155])
    header.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), INK), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 16), ("RIGHTPADDING", (-1, 0), (-1, 0), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LINEBELOW", (0, 0), (-1, -1), 3, CRIMSON)]))

    # Left column
    left = [Paragraph("Who we are", ctitle),
            Paragraph("Dot One Media (DOT ONE LLC) is a veteran-owned media and production studio in Wasilla, Alaska, established 2021. We produce photography, video, and documentary work, run live and recorded broadcast, and build our own digital media platforms — a rare combination of production craft and technical capability, delivered on documented, repeatable processes.", cbody),
            Paragraph("Core competencies", ctitle),
            bullet("Photography — portraits, events, ceremonies, commercial"),
            bullet("Video &amp; film production — corporate, documentary, promotional"),
            bullet("Live &amp; recorded broadcast production (multi-camera, graphics)"),
            bullet("Aerial / drone imaging (FAA Part 107 in progress)"),
            bullet("Digital media platforms — apps, websites, news systems"),
            bullet("Graphic design &amp; brand media"),
            Paragraph("Differentiators", ctitle),
            bullet("Veteran-owned; SDVOSB certification in progress"),
            bullet("Alaska-based presence in an underserved market"),
            bullet("Full production <i>and</i> custom software under one roof"),
            bullet("Documented, repeatable delivery on every engagement"),
            Paragraph("Representative work", ctitle),
            bullet("Military ceremony photography"),
            bullet("Historical films for an Alaska veterans museum"),
            bullet("Built and operate Dot 1 News — an iOS/Android news app, website, and broadcast")]

    # Right column — company data box
    def row(k, v): return [Paragraph(k, lab), Paragraph(v, val)]
    data = Table([
        [Paragraph("COMPANY DATA", ParagraphStyle("cd", fontName="Courier", fontSize=8, textColor=HexColor("#ffffff"))), ""],
        row("Legal name", "DOT ONE LLC (dba Dot One Media)"),
        row("UEI", "R3MTPRVZ9L42"),
        row("CAGE", "22YZ5"),
        row("SAM.gov", "Active"),
        row("Business type", "Veteran-Owned Small Business; SDVOSB certification in progress"),
        row("Established", "2021"),
        row("Location", "Wasilla, Alaska"),
        row("NAICS (confirm to SAM)", "541922 Commercial Photography (primary); 512110 &amp; 512199 Video/Film Production; 541430 Graphic Design; 541890 Advertising-related"),
    ], colWidths=[70, 105])
    data.setStyle(TableStyle([("SPAN", (0, 0), (1, 0)), ("BACKGROUND", (0, 0), (-1, 0), DEEP),
        ("BACKGROUND", (0, 1), (-1, -1), PAPER), ("BOX", (0, 0), (-1, -1), 0.8, HAIR),
        ("INNERGRID", (0, 1), (-1, -1), 0.4, HAIR), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    contact_box = Table([[Paragraph("CONTACT", ParagraphStyle("ct", fontName="Courier", fontSize=8, textColor=HexColor("#ffffff")))],
                         [Paragraph("Dennis Matthews Jr., Founder", val)],
                         [Paragraph("contact@dot1.media", ParagraphStyle("v2", parent=val, fontName="Helvetica"))],
                         [Paragraph("907·203·4993", ParagraphStyle("v3", parent=val, fontName="Helvetica"))],
                         [Paragraph("dot1.media", ParagraphStyle("v4", parent=val, fontName="Helvetica"))]], colWidths=[175])
    contact_box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), CRIMSON), ("BACKGROUND", (0, 1), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.8, HAIR), ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    right = [data, SP(8), contact_box]

    cols = Table([[left, right]], colWidths=[300, 185])
    cols.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("LEFTPADDING", (1, 0), (1, 0), 14), ("RIGHTPADDING", (-1, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))

    story = [header, SP(14), cols, SP(12),
             Table([[Paragraph("Just Truth, No Bias · A Declared Standpoint · Veteran-Owned · Wasilla, Alaska",
                     ParagraphStyle("f", fontName="Courier", fontSize=7.5, textColor=MUTED, alignment=TA_CENTER))]],
                   colWidths=[485], style=TableStyle([("LINEABOVE", (0, 0), (-1, -1), 0.8, GOLD), ("TOPPADDING", (0, 0), (-1, -1), 8)]))]
    d = Packet(os.path.join(OUT, "Dot1Media-Capability-Statement.pdf"), "CAPABILITY STATEMENT", has_cover=False)
    d.title = "Dot One Media — Capability Statement"
    # remove running chrome for a clean one-pager
    d.pageTemplates[0].onPage = lambda c, doc: None
    d.build(story)

# ============================ SDVOSB STARTER ============================
def build_sdvosb():
    s = cover("SDVOSB Contracting Starter", "Getting certified and winning veteran set-aside work")
    s += [KICK("THE OPPORTUNITY"), H1("Why this is your compounding play")]
    s += [P("The federal government targets <b>5% of all contract dollars</b> — roughly <b>$31 billion a year</b> — to Service-Disabled Veteran-Owned Small Businesses, and agencies that miss the goal must report corrective action. That means real institutional pressure to find certified SDVOSBs. For Dot One Media, this is the stable, repeatable revenue that one-off shoots can't match: <b>set-aside</b> contracts (only SDVOSBs compete) and <b>sole-source</b> awards (given directly, no competition, up to a dollar threshold).")]
    s += [box([NOTE("Certification opens the door; performance keeps it open. Treat this as a multi-quarter relationship-building play, not a lottery ticket.")])]

    s += [H2("Are you eligible?")]
    s += [B("<b>Service-disabled veteran ownership</b> — at least 51% owned <i>and</i> controlled by one or more veterans with a VA service-connected disability rating. <b>Any rating counts, even 0%</b> — you just need a service-connected condition on record."),
          B("<b>Control</b> — the service-disabled veteran runs daily operations and long-term decisions (this is the part SBA scrutinizes most)."),
          B("<b>Small business</b> — under the SBA size standard for your NAICS codes (creative-services codes are revenue-based; confirm each in your SAM profile)."),
          B("<b>U.S.-based, active SAM.gov</b> — you already have this (UEI R3MTPRVZ9L42, CAGE 22YZ5, active).")]
    s += [NOTE("If you're a veteran but <i>not</i> service-disabled, the veteran-owned (VOSB) certification is the equivalent and still gets set-asides at the VA. Confirm which you qualify for.")]

    s += [H2("How certification works now (this changed)")]
    s += [B("Certification is through the <b>SBA VetCert portal</b> (certify.sba.gov). The old VA CVE process is gone and doesn't transfer automatically."),
          B("<b>Self-certification ended December 22, 2024</b> — you must be SBA-certified to win any SDVOSB set-aside or sole-source contract, or to count toward an agency's goal."),
          B("<b>It's free</b> — the SBA charges no fees at any step. Beware paid services implying otherwise."),
          B("<b>Timing</b> — the SBA cleared its backlog; recent processing has averaged around two weeks, though completeness of your file drives it. Certification lasts <b>three years</b>.")]

    s += [H2("Documents to gather before you apply")]
    s += [B("Your <b>DD-214</b> (discharge documentation)."),
          B("Your <b>VA service-connected disability rating letter</b>."),
          B("<b>Formation documents</b> — the LLC articles of organization and operating agreement (showing 51%+ veteran ownership and control)."),
          B("Recent <b>business and personal tax returns</b> and basic financials."),
          B("<b>Ownership and control records</b> — anything proving you run daily operations and long-term decisions.")]
    s += [NOTE("Most rejections come from ownership/control paperwork not clearly showing the veteran is in charge — get the operating agreement right first. The free advisors below will review it with you at no cost.")]

    s += [H2("The steps")]
    s += [N(1, "Confirm your SAM.gov registration is active and your NAICS codes and size are right (you're set here)."),
          N(2, "Make sure the VA has you identified as a veteran / service-disabled veteran (VetCert checks this)."),
          N(3, "Assemble the document package above."),
          N(4, "Apply at <b>certify.sba.gov</b> (VetCert). It's free."),
          N(5, "Respond quickly to any SBA requests; a complete file is certified fastest."),
          N(6, "Once certified, mark it on your capability statement and in SAM.")]

    s += [H2("After you're certified — finding and winning work")]
    s += [B("<b>Where the work is</b>: SAM.gov (search and set saved-search alerts for your NAICS + set-aside type); agency forecasts; and the VA's Office of Small &amp; Disadvantaged Business Utilization (OSDBU)."),
          B("<b>Who to target for media work</b>: the VA, National Park Service, tribal/BIA and Native-serving programs, DoD and Coast Guard public-affairs media, and federal offices <b>in Alaska</b> — your locality is an advantage where on-site presence matters."),
          B("<b>Your front door</b>: the one-page capability statement (built alongside this). Email it to small-business specialists and contracting officers with a short, specific note."),
          B("<b>On-ramp</b>: subcontract to established primes first to build federal past performance, then pursue prime set-asides."),
          B("<b>Free help — use it</b>: an <b>APEX Accelerator</b> (formerly PTAC) and a <b>Veterans Business Outreach Center (VBOC)</b> give free counseling on registration, certification, bid-matching, and proposals. The SBA and SBDC add general support. These are the highest-leverage free resources in government contracting.")]

    s += [H2("A realistic first year")]
    s += [B("Get certified. Build relationships with a handful of target agencies' small-business specialists."),
          B("Win one or two small awards or subcontracts to establish federal past performance."),
          B("Keep SAM and the certification current (they lapse — see your renewals sheet)."),
          B("Let studio revenue fund the patience this path requires.")]

    s += [SP(8), box([Paragraph("Verify the specifics at the official sources — sba.gov (Veterans contracting), certify.sba.gov, and 13 CFR Part 128 — and work with a free APEX Accelerator or VBOC. This starter is a map, not legal or contracting advice; the certification and any legal/tax questions belong with those advisors and an attorney/accountant.", ParagraphStyle("disc", parent=sty["body"], fontSize=8.5, textColor=DEEP))], bg=HexColor("#f6efe0"), stroke=GOLD)]

    d = Packet(os.path.join(OUT, "Dot1Media-SDVOSB-Starter.pdf"), "SDVOSB STARTER")
    d.title = "Dot One Media — SDVOSB Contracting Starter"; d.build(s)

def build():
    build_capability(); build_sdvosb()
    print("Business docs built.")

if __name__ == "__main__":
    build()
