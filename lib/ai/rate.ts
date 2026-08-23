import { IndicatorScores, IndexTotals, INDICATOR_KEYS, normalizeIndicators, computeIndexTotals } from "@/lib/scoring";

// Dual-rater reconciliation, folded into the editorial workflow. The AI scorer is the first rater
// on an AI draft; a human provides the second. When the two are close their 20 indicators are
// averaged; when they diverge a third rater breaks the tie. This mirrors the news app's rule:
// variance is the mean absolute difference across the four index totals, and a spread above the
// threshold requires a third opinion. Kept faithful so scores stay comparable across the migration.

export const HIGH_VARIANCE_THRESHOLD = 2;

export interface Rating {
  rater_kind: string;
  rater_id: string;
  rater_name: string;
  indicators: IndicatorScores;
}

export interface Reconciliation {
  complete: boolean;
  needs: "second" | "third" | null;
  indicators: IndicatorScores;
  totals: IndexTotals;
  variance: number | null;
  method: "single" | "two_rater_average" | "closest_two_average" | "three_rater_average";
  raterCount: number;
}

function avgIndicators(list: IndicatorScores[]): IndicatorScores {
  const out: any = {};
  for (const k of INDICATOR_KEYS) {
    const vals = list.map((x) => Number((x as any)[k]) || 0);
    out[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return normalizeIndicators(out);
}

// Mean absolute difference across the four index totals between two indicator sets.
function totalsVariance(a: IndicatorScores, b: IndicatorScores): number {
  const ta = computeIndexTotals(a) as any;
  const tb = computeIndexTotals(b) as any;
  const keys = ["biblicalAlignment", "propheticSignificance", "sourceCredibility", "humanities"];
  const sum = keys.reduce((acc, k) => acc + Math.abs((ta[k] || 0) - (tb[k] || 0)), 0);
  return sum / keys.length;
}

export function reconcile(ratings: Rating[]): Reconciliation {
  const rs = ratings.map((r) => normalizeIndicators(r.indicators as any));

  if (rs.length === 0) {
    const zero = normalizeIndicators({});
    return { complete: false, needs: "second", indicators: zero, totals: computeIndexTotals(zero), variance: null, method: "single", raterCount: 0 };
  }
  if (rs.length === 1) {
    return { complete: false, needs: "second", indicators: rs[0], totals: computeIndexTotals(rs[0]), variance: null, method: "single", raterCount: 1 };
  }
  if (rs.length === 2) {
    const v = totalsVariance(rs[0], rs[1]);
    if (v > HIGH_VARIANCE_THRESHOLD) {
      // Too far apart to trust an average; show a provisional blend but require a third rater.
      const prov = avgIndicators(rs);
      return { complete: false, needs: "third", indicators: prov, totals: computeIndexTotals(prov), variance: v, method: "two_rater_average", raterCount: 2 };
    }
    const ind = avgIndicators(rs);
    return { complete: true, needs: null, indicators: ind, totals: computeIndexTotals(ind), variance: v, method: "two_rater_average", raterCount: 2 };
  }

  // Three or more: use the first three, average the closest pair (least total variance); if all
  // pairs are equidistant, average all three.
  const [a, b, c] = rs;
  const dAB = totalsVariance(a, b), dAC = totalsVariance(a, c), dBC = totalsVariance(b, c);
  const min = Math.min(dAB, dAC, dBC);
  let ind: IndicatorScores; let method: Reconciliation["method"];
  if (dAB === dAC && dAC === dBC) { ind = avgIndicators([a, b, c]); method = "three_rater_average"; }
  else if (min === dAB) { ind = avgIndicators([a, b]); method = "closest_two_average"; }
  else if (min === dAC) { ind = avgIndicators([a, c]); method = "closest_two_average"; }
  else { ind = avgIndicators([b, c]); method = "closest_two_average"; }
  return { complete: true, needs: null, indicators: ind, totals: computeIndexTotals(ind), variance: min, method, raterCount: rs.length };
}
