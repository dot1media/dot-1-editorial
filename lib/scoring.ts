// D1-4LS scoring for the editorial portal. This mirrors the news app's canonical engine so a
// score computed here maps cleanly onto the news database when a story publishes. Same model:
// 4 indices (BAI, PSI, SCI, HII), 5 indicators each, every indicator 0-2, index total = sum of
// its 5 (0-10), overall = sum of the 4 (0-40). Totals are ALWAYS derived from indicators; any
// supplied total is advisory. Per the Handbook (Part IV): a score of 1 is ordinary competence,
// not failure; the profile matters more than the total; the person outranks the instrument.

export interface IndicatorScores {
  baiScripturalConsistency: number;
  baiDoctrinalIntegrity: number;
  baiMoralFramework: number;
  baiAnthropology: number;
  baiTeleology: number;
  psiTextualLinkage: number;
  psiEschatologicalFit: number;
  psiHistoricalContinuity: number;
  psiSpiritualImpact: number;
  psiTheologicalRestraint: number;
  sciPrimarySourceAccess: number;
  sciVerification: number;
  sciTransparency: number;
  sciTrackRecord: number;
  sciEditorialStandards: number;
  hiiHumanDignity: number;
  hiiCompassionEmpathy: number;
  hiiSocietalImpact: number;
  hiiJusticeResponsibility: number;
  hiiChristModeledCare: number;
}

export interface IndexTotals {
  biblicalAlignment: number;
  propheticSignificance: number;
  sourceCredibility: number;
  humanities: number;
  total: number;
}

export type ScoreConfidence = "high" | "moderate" | "developing";

export const INDICATOR_KEYS: (keyof IndicatorScores)[] = [
  "baiScripturalConsistency", "baiDoctrinalIntegrity", "baiMoralFramework", "baiAnthropology", "baiTeleology",
  "psiTextualLinkage", "psiEschatologicalFit", "psiHistoricalContinuity", "psiSpiritualImpact", "psiTheologicalRestraint",
  "sciPrimarySourceAccess", "sciVerification", "sciTransparency", "sciTrackRecord", "sciEditorialStandards",
  "hiiHumanDignity", "hiiCompassionEmpathy", "hiiSocietalImpact", "hiiJusticeResponsibility", "hiiChristModeledCare",
];

// Map each camelCase indicator to the news database column (news_stories table).
export const INDICATOR_DB_COLUMN: Record<keyof IndicatorScores, string> = {
  baiScripturalConsistency: "bai_scriptural_consistency",
  baiDoctrinalIntegrity: "bai_doctrinal_integrity",
  baiMoralFramework: "bai_moral_framework",
  baiAnthropology: "bai_anthropology",
  baiTeleology: "bai_teleology",
  psiTextualLinkage: "psi_textual_linkage",
  psiEschatologicalFit: "psi_eschatological_fit",
  psiHistoricalContinuity: "psi_historical_continuity",
  psiSpiritualImpact: "psi_spiritual_impact",
  psiTheologicalRestraint: "psi_theological_restraint",
  sciPrimarySourceAccess: "sci_primary_source_access",
  sciVerification: "sci_verification",
  sciTransparency: "sci_transparency",
  sciTrackRecord: "sci_track_record",
  sciEditorialStandards: "sci_editorial_standards",
  hiiHumanDignity: "hii_human_dignity",
  hiiCompassionEmpathy: "hii_compassion_empathy",
  hiiSocietalImpact: "hii_societal_impact",
  hiiJusticeResponsibility: "hii_justice_responsibility",
  hiiChristModeledCare: "hii_christ_modeled_care",
};

export const INDEX_META: { key: "BAI" | "PSI" | "SCI" | "HII"; name: string; indicators: { key: keyof IndicatorScores; label: string; anchors: [string, string, string] }[] }[] = [
  {
    key: "BAI", name: "Biblical Alignment",
    indicators: [
      { key: "baiScripturalConsistency", label: "Scriptural Consistency", anchors: ["Contradicts clear biblical teaching", "Neutral or indirect alignment", "Explicitly consistent with Scripture"] },
      { key: "baiDoctrinalIntegrity", label: "Doctrinal Integrity", anchors: ["Affirms false or heretical claims", "Avoids error but lacks clarity", "Aligns with historic orthodoxy"] },
      { key: "baiMoralFramework", label: "Moral Framework", anchors: ["Relativistic or anti-biblical ethics", "Mixed or implicit moral stance", "Coherent biblical moral logic"] },
      { key: "baiAnthropology", label: "Anthropology", anchors: ["Dehumanizing or reductionist", "Partially dignifying", "Affirms imago Dei"] },
      { key: "baiTeleology", label: "Teleology", anchors: ["Purposeless or nihilistic", "Implicit meaning", "Points toward divine purpose"] },
    ],
  },
  {
    key: "PSI", name: "Prophetic Significance",
    indicators: [
      { key: "psiTextualLinkage", label: "Textual Linkage", anchors: ["No scriptural connection", "Loose thematic echo", "Clear textual grounding"] },
      { key: "psiEschatologicalFit", label: "Eschatological Fit", anchors: ["Forced or sensational", "Plausible relevance", "Sober, well-fitted"] },
      { key: "psiHistoricalContinuity", label: "Historical Continuity", anchors: ["Ahistorical claim", "Some continuity", "Strong historical grounding"] },
      { key: "psiSpiritualImpact", label: "Spiritual Impact", anchors: ["Trivial or distracting", "Mild significance", "Genuine spiritual weight"] },
      { key: "psiTheologicalRestraint", label: "Theological Restraint", anchors: ["Speculation as certainty", "Some overreach", "Relevance held with humility"] },
    ],
  },
  {
    key: "SCI", name: "Source Credibility",
    indicators: [
      { key: "sciPrimarySourceAccess", label: "Primary Source Access", anchors: ["No primary sourcing", "Some primary access", "Direct primary sources"] },
      { key: "sciVerification", label: "Verification", anchors: ["Unverified", "Partially corroborated", "Independently corroborated"] },
      { key: "sciTransparency", label: "Transparency", anchors: ["Opaque sourcing", "Partial disclosure", "Fully transparent"] },
      { key: "sciTrackRecord", label: "Track Record", anchors: ["Poor reliability", "Mixed record", "Strong reliability"] },
      { key: "sciEditorialStandards", label: "Editorial Standards", anchors: ["No visible standards", "Some standards", "Rigorous standards"] },
    ],
  },
  {
    key: "HII", name: "Humanities Impact",
    indicators: [
      { key: "hiiHumanDignity", label: "Human Dignity", anchors: ["Degrades persons", "Neutral", "Upholds dignity"] },
      { key: "hiiCompassionEmpathy", label: "Compassion & Empathy", anchors: ["Callous", "Detached", "Genuinely compassionate"] },
      { key: "hiiSocietalImpact", label: "Societal Impact", anchors: ["Harmful", "Neutral", "Constructive"] },
      { key: "hiiJusticeResponsibility", label: "Justice & Responsibility", anchors: ["Unjust framing", "Mixed", "Just and responsible"] },
      { key: "hiiChristModeledCare", label: "Christ-Modeled Care", anchors: ["Contrary to Christ's example", "Partial", "Reflects Christ's care"] },
    ],
  },
];

export function clampIndicator(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(2, n));
}

export function normalizeIndicators(raw: Partial<Record<keyof IndicatorScores, unknown>>): IndicatorScores {
  const out = {} as IndicatorScores;
  for (const key of INDICATOR_KEYS) out[key] = clampIndicator(raw?.[key]);
  return out;
}

export function computeIndexTotals(ind: IndicatorScores): IndexTotals {
  const biblicalAlignment =
    ind.baiScripturalConsistency + ind.baiDoctrinalIntegrity + ind.baiMoralFramework + ind.baiAnthropology + ind.baiTeleology;
  const propheticSignificance =
    ind.psiTextualLinkage + ind.psiEschatologicalFit + ind.psiHistoricalContinuity + ind.psiSpiritualImpact + ind.psiTheologicalRestraint;
  const sourceCredibility =
    ind.sciPrimarySourceAccess + ind.sciVerification + ind.sciTransparency + ind.sciTrackRecord + ind.sciEditorialStandards;
  const humanities =
    ind.hiiHumanDignity + ind.hiiCompassionEmpathy + ind.hiiSocietalImpact + ind.hiiJusticeResponsibility + ind.hiiChristModeledCare;
  return {
    biblicalAlignment,
    propheticSignificance,
    sourceCredibility,
    humanities,
    total: biblicalAlignment + propheticSignificance + sourceCredibility + humanities,
  };
}

// The instrument version this engine implements. Stamped onto every published
// story so historical scores are never silently reinterpreted under a new rubric
// (D1-4LS v2.1, Section 19).
export const INSTRUMENT_VERSION = "2.1";

// v2.1 presents the composite as a DESCRIPTIVE band, never an evaluative grade.
// The four-index profile is the primary result; this band is a secondary summary
// and must never be read as truth, probability, or overall quality.
export type CompositeBandKey = "very-high" | "high" | "intermediate" | "low";
export function compositeBand(total: number): { key: CompositeBandKey; label: string; short: string } {
  if (total >= 35) return { key: "very-high", label: "Very high composite profile", short: "Very high" };
  if (total >= 28) return { key: "high", label: "High composite profile", short: "High" };
  if (total >= 20) return { key: "intermediate", label: "Intermediate composite profile", short: "Intermediate" };
  return { key: "low", label: "Low composite profile", short: "Low" };
}

// Back-compat: returns the descriptive short band. Prefer compositeBand().
export function interpretTotal(total: number): string {
  return compositeBand(total).short;
}

// Source-credibility alert bands (v2.1, Section 7). SCI is the sourcing lens
// (0-10). These are provisional editorial thresholds, not validated cutoffs, and
// they never declare an article false.
export type SciNoticeLevel = "none" | "limitation" | "warning";
export function sciNotice(sciTotal: number): { level: SciNoticeLevel; text: string } {
  if (sciTotal <= 3) return { level: "warning", text: "Evidence warning: this story has material sourcing limitations. Weigh its factual claims accordingly." };
  if (sciTotal < 6) return { level: "limitation", text: "Sourcing limitation: read the Source Credibility notes before relying on this story's factual claims." };
  return { level: "none", text: "" };
}

// Profile-balance descriptor from the spread of the four index totals (v2.1,
// Section 12). Descriptive only; not a quality rating.
export function profileBalance(totals: IndexTotals): { diff: number; label: string } {
  const vals = [totals.biblicalAlignment, totals.propheticSignificance, totals.sourceCredibility, totals.humanities];
  const diff = Math.max(...vals) - Math.min(...vals);
  const label = diff <= 2 ? "Relatively balanced" : diff <= 5 ? "Moderately uneven" : "Highly uneven";
  return { diff, label };
}
