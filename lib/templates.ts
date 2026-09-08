// Story templates: a starting structure, not a finished draft. Each sets classification/priority
// and seeds the summary and body with the sections the desk expects for that kind of story.
export type StoryTemplate = { id: string; label: string; blurb: string; classification: string; priority: string; summary: string; body: string };
export const STORY_TEMPLATES: StoryTemplate[] = [
  { id: "blank", label: "Blank", blurb: "Start from nothing.", classification: "news", priority: "routine", summary: "", body: "" },
  { id: "breaking", label: "Breaking", blurb: "Fast, factual, updated as it develops.", classification: "news", priority: "breaking", summary: "WHAT happened, WHERE, WHEN, in one sentence.",
    body: "WHAT WE KNOW\n- \n- \n\nWHAT WE DON'T KNOW YET\n- \n\nWHO IS AFFECTED\n\n\nWHAT HAPPENS NEXT\n\n\nSOURCES (name each; confirm before publish)\n- \n\n[This story is developing and will be updated.]" },
  { id: "feature", label: "Feature", blurb: "A person, a place, a story worth sitting with.", classification: "news", priority: "routine", summary: "The one-line promise of this story.",
    body: "LEDE (a scene, a moment, a person)\n\n\nNUT GRAF (why this matters, why now)\n\n\nSECTION 1\n\n\nSECTION 2\n\n\nSECTION 3\n\n\nKICKER (end on an image or a line that lands)\n" },
  { id: "explainer", label: "Explainer", blurb: "Answer the question people are actually asking.", classification: "analysis", priority: "routine", summary: "The question this explains, plainly.",
    body: "THE QUESTION\n\n\nTHE SHORT ANSWER\n\n\nBACKGROUND (how we got here)\n\n\nWHAT IT MEANS FOR YOU\n\n\nWHAT TO WATCH\n\n\nWHERE THIS CAME FROM (sources, documents, data)\n- " },
  { id: "community", label: "Community notice", blurb: "Events, closures, meetings, announcements.", classification: "news", priority: "routine", summary: "WHAT, WHEN, WHERE, and who to contact.",
    body: "WHAT\n\n\nWHEN\n\n\nWHERE\n\n\nWHO IT'S FOR\n\n\nCOST / REGISTRATION\n\n\nCONTACT\n\n\nSOURCE (organizer, agency, or document)\n" },
  { id: "opinion", label: "Opinion", blurb: "A clearly labeled viewpoint.", classification: "opinion", priority: "routine", summary: "The argument in one sentence.",
    body: "THE CLAIM\n\n\nTHE STRONGEST CASE FOR IT\n\n\nTHE STRONGEST CASE AGAINST IT (steelman it)\n\n\nWHERE I LAND, AND WHY\n\n\nDISCLOSURES (any interest or relationship the reader should know)\n" },
];
