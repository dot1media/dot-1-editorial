// Lightweight relatedness: token overlap on headline + summary, weighted toward headline words.
const STOP = new Set("a an the and or but of to in on at for with by from as is are was were be been this that these those it its into over under about after before during than then so if not no yes new says said say will would could should may might can just also more most very up down out off our your their his her they them we you i he she who what when where why how".split(" "));
export function tokens(text: string): string[] {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}
export function scoreRelated(aHead: string, aSum: string, bHead: string, bSum: string): { score: number; shared: string[] } {
  const ah = new Set(tokens(aHead)), bh = new Set(tokens(bHead));
  const at = new Set([...ah, ...tokens(aSum)]), bt = new Set([...bh, ...tokens(bSum)]);
  if (!at.size || !bt.size) return { score: 0, shared: [] };
  const sharedHead = [...ah].filter((w) => bh.has(w));
  const sharedAll = [...at].filter((w) => bt.has(w));
  const cosine = sharedAll.length / Math.sqrt(at.size * bt.size);
  const score = Math.min(1, cosine + sharedHead.length * 0.12);
  return { score, shared: sharedHead.length ? sharedHead : sharedAll.slice(0, 6) };
}
export function rankRelated(me: { id?: string; head: string; sum: string; category?: string }, others: any[], limit = 6) {
  return others
    .filter((o) => o.id !== me.id)
    .map((o) => { const r = scoreRelated(me.head, me.sum, o.final_headline || o.working_headline || "", o.summary || ""); return { id: o.id, headline: o.final_headline || o.working_headline, status: o.status, category: o.category, score: r.score, shared: r.shared, duplicate: r.score >= 0.55 && (!me.category || o.category === me.category) }; })
    .filter((x) => x.score >= 0.22)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
