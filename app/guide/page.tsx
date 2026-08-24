"use client";

import Shell from "@/components/Shell";

// Staff-facing guide. Plain-language explanation of how content moves through the newsroom and how
// to troubleshoot, so a new worker can get oriented without a walkthrough. Content only; no data.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="disp" style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14.5, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 12px" }}>{children}</p>;
}

export default function GuidePage() {
  return (
    <Shell title="Newsroom Guide" subtitle="How content reaches readers, and what to do when something looks wrong.">
      <div style={{ maxWidth: 820 }}>

        <Section title="The big picture">
          <P>A story can start three ways: a reporter writes it, the <b>AI Desk</b> generates it from the wire, or it arrives as a public <b>tip</b>. However it starts, it moves through the same pipeline: reporting and sources, then verification, then editorial review, then scoring, then publication.</P>
          <P>Publishing writes the story into the news database that powers <b>news.dot1.media</b> and the app. Nothing reaches readers without clearing review. This portal is the newsroom; the app and website only display what the portal publishes.</P>
        </Section>

        <Section title="Where stories come from">
          <P><b>Reporters.</b> Create a story from Stories, then work the tabs: sources, evidence, the reporting log, verification claims, the script, the D1-4LS score, and the review checklist.</P>
          <P><b>AI Desk.</b> Open AI Desk and press Generate now. It pulls the wire (Alaska, US politics, faith, and the other feeds), writes drafts, scores them, and drops each in as a story in the Verification stage marked as AI. A schedule also generates automatically in the background. AI drafts are still ordinary stories: they go through the full review workflow before anything publishes.</P>
          <P><b>Tips.</b> Public tips sent from the app, the news site, or the main site land in Tips. Triage them there and promote the good ones into stories.</P>
        </Section>

        <Section title="The review workflow">
          <P>Every story carries its sources, an evidence locker, a reporting log, verification claims (Confirmed, Unconfirmed, Disputed, or False), the D1-4LS score, and the editorial review checklist.</P>
          <P>The review status is computed automatically from the actual work, climbing a ladder: <b>Not Verified → Partially Verified → Verified → Editor Approved → Ready to Publish</b>. A story only reaches Ready to Publish when its claims are handled, the checklist is complete, and an editor has approved it. You don't set the status by hand; you do the work and it follows.</P>
        </Section>

        <Section title="Scoring and the dual-rater">
          <P>Every story gets a D1-4LS score: four indices (BAI, PSI, SCI, HII), five indicators each, each 0 to 2, for an overall out of 40. The score informs the editor; it doesn't decide for them.</P>
          <P>For accuracy the score is <b>dual-rated</b>. On an AI story the AI scorer is the first rater automatically. A person adds the second rating on the story's Score tab: set the indicators as your own judgment, then Submit my rating. If the two raters are close, their scores are averaged. If they diverge too far, the panel asks for a third rating to break the tie. The reconciled score is what publishes.</P>
        </Section>

        <Section title="Publishing and auto-publish">
          <P><b>Human stories</b> publish from the story once it's Ready to Publish. If someone needs to publish before that, it requires the override capability and a written reason, which is recorded.</P>
          <P><b>AI stories auto-publish.</b> The moment an AI story is both Ready to Publish and its dual-rate is complete, it posts to the news site on its own. So an AI draft needs two things to go live: clear the review ladder (claims, checklist, editor approval) and have its second human rating in.</P>
          <P>Published stories show a gold mark in the app: "Verified by two independent raters" for dual-rated stories, or "Approved by an editor" otherwise.</P>
        </Section>

        <Section title="Managing what's already live (Published)">
          <P>The <b>Published</b> section shows everything currently on the news site, including older articles from before this system existed. Use the tabs for Articles, Photos, and Videos, and the search box to find something.</P>
          <P>You can edit an article's headline, summary, body, category, byline, and hero image in place, and you can delete articles, photos, and videos. <b>Edits and deletes here are immediate and permanent on the live site</b> — there's no draft step and no undo, so treat it like editing the front page, because you are. Scores aren't edited here; re-scoring goes through the story workflow and the dual-rater.</P>
        </Section>

        <Section title="Broadcast graphics (for producers)">
          <P><b>Lower thirds</b> come from a rundown. Open an episode, pick a segment with a prepared lower third, and use Take to air and Clear to put it on the program output.</P>
          <P><b>The bug, ticker, and breaking banner</b> come from Broadcast, then On-air graphics. Set them and press Show or Hide.</P>
          <P>Both paths reach OBS through a server channel called the bus. That indirection exists because OBS runs its own browser that can't share anything with yours, so the graphics travel through the server instead. Point an OBS browser source at the overlay output; anything you push appears there within about a second.</P>
        </Section>

        <Section title="Troubleshooting">
          <P><b>AI Desk says "not configured."</b> The generation key isn't set on the portal's hosting. A maintainer needs to add it; nothing a reporter can fix.</P>
          <P><b>An AI draft won't auto-publish.</b> It needs both halves: Ready to Publish (claims handled, checklist complete, editor approved) and a complete dual-rate (a second human rating submitted). Open the story and check the review status and the Dual-Rater panel on the Score tab.</P>
          <P><b>A published story shows no gold mark.</b> It was likely published before the provenance update, or it never got a second rating. New stories that clear the dual-rater show the mark. You can re-open and re-publish if needed.</P>
          <P><b>Graphics don't show in OBS.</b> Hard-refresh the OBS browser source so it reloads the overlay, confirm the source points at the overlay output, and confirm you have broadcast permissions. Changes only reach a build of the overlay that's been refreshed since the last update.</P>
          <P><b>A story won't publish.</b> It isn't Ready to Publish yet. Finish the claims, complete the checklist, and get editor approval. Publishing earlier needs the override capability and a reason.</P>
          <P><b>A page or button isn't there.</b> It's permission-gated to your role. Ask an Owner to grant the capability from Accounts.</P>
          <P><b>Published edit or delete says it's unavailable.</b> The portal's connection to the news database isn't set on the hosting. A maintainer needs to configure it.</P>
          <P><b>Tips aren't arriving.</b> Confirm the sending site is pointed at the tip endpoint. Tips that arrive show up under Tips; if the app or a site can send but nothing appears, tell a maintainer.</P>
        </Section>

        <Section title="Who can do what">
          <P>Access is by role, with per-person adjustments. Owner can do everything and grants access to others. Editors review, approve, and publish. Reporters create and work stories. Producers run the broadcast. Viewers can look but not change. If you need something you can't reach, an Owner grants it per person from the Accounts page.</P>
        </Section>

      </div>
    </Shell>
  );
}
