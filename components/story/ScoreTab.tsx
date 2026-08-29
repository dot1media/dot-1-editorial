"use client";

import { useState, useEffect } from "react";
import { api, useMe } from "@/lib/client";
import { INDEX_META, computeIndexTotals, normalizeIndicators, interpretTotal, IndicatorScores } from "@/lib/scoring";
import type { Capability } from "@/lib/permissions";

export default function ScoreTab({ data, reload, can }: { data: any; reload: () => void; can: (c: Capability) => boolean }) {
  const { me } = useMe();
  const editable = can("story.edit");
  const existing = data.story.scores?.indicators || {};
  const [ind, setInd] = useState<IndicatorScores>(normalizeIndicators(existing));
  const [confidence, setConfidence] = useState(data.story.score_confidence || "developing");
  const [notes, setNotes] = useState(data.story.scores?.notes || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Dual-rate state: the ratings on this story and their reconciliation.
  const canRate = can("review.complete");
  const [ratings, setRatings] = useState<any[]>([]);
  const [rec, setRec] = useState<any>(null);
  const [rateBusy, setRateBusy] = useState(false);
  const [rateMsg, setRateMsg] = useState("");
  const myEmail = me?.email;
  const alreadyRated = ratings.some((r) => r.rater_id === myEmail);

  async function loadRatings() {
    try {
      const d = await api<{ ratings: any[]; reconciliation: any }>(`/api/stories/${data.story.id}/rate`);
      setRatings(d.ratings || []); setRec(d.reconciliation);
    } catch { /* endpoint may be empty */ }
  }
  useEffect(() => { loadRatings(); /* eslint-disable-next-line */ }, [data.story.id]);

  async function submitRating() {
    setRateBusy(true); setRateMsg("");
    try {
      const r = await api<{ autoPublished: boolean }>(`/api/stories/${data.story.id}/rate`, { method: "POST", body: JSON.stringify({ indicators: ind, notes }) });
      setRateMsg(r.autoPublished ? "Rating saved. Story cleared review and auto-published." : "Rating saved.");
      await loadRatings(); reload();
    } catch (e: any) { setRateMsg(e.message || "Could not submit rating."); }
    finally { setRateBusy(false); }
  }

  const totals = computeIndexTotals(ind);

  function setVal(key: keyof IndicatorScores, v: number) { setInd((p) => ({ ...p, [key]: v })); setSaved(false); }

  async function save() {
    setBusy(true);
    try {
      await api(`/api/stories/${data.story.id}/score`, { method: "POST", body: JSON.stringify({ indicators: ind, confidence, notes }) });
      setSaved(true);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="card pad">
        <div className="row-between">
          <div>
            <div className="disp" style={{ fontSize: 30, fontWeight: 700 }}>{totals.total}<span className="muted" style={{ fontSize: 16 }}>/40</span></div>
            <div className="tiny muted">{interpretTotal(totals.total)} · read the profile, not the total</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["BAI", totals.biblicalAlignment], ["PSI", totals.propheticSignificance], ["SCI", totals.sourceCredibility], ["HII", totals.humanities]].map(([k, v]) => (
              <div key={k as string} style={{ textAlign: "center" }}>
                <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
                <div className="mini">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dual-rater: shown once there is at least one rating (AI drafts start with the AI scorer). */}
      {ratings.length > 0 && (
        <div className="card pad stack">
          <div className="row-between">
            <div className="mini">DUAL-RATER</div>
            {rec && (
              <span className={"chip" + (rec.complete ? " ok" : "")}>
                {rec.complete ? "Reconciled" : rec.needs === "third" ? "Divergent, needs a third" : "Needs a second"}
              </span>
            )}
          </div>
          <div className="table-wrap"><table className="grid-t">
            <thead><tr><th>Rater</th><th>BAI</th><th>PSI</th><th>SCI</th><th>HII</th></tr></thead>
            <tbody>
              {ratings.map((r) => {
                const t = computeIndexTotals(normalizeIndicators(r.scores || {}));
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.rater_kind === "ai" ? "AI scorer" : r.rater_name}{r.rater_kind === "ai" && <span className="chip" style={{ marginLeft: 6 }}>ai</span>}</td>
                    <td className="mono tiny">{t.biblicalAlignment}</td><td className="mono tiny">{t.propheticSignificance}</td>
                    <td className="mono tiny">{t.sourceCredibility}</td><td className="mono tiny">{t.humanities}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          {rec && (
            <div className="tiny muted">
              {rec.method === "single" ? "One rating so far. A second reviewer confirms or corrects the score." :
               rec.complete ? `Reconciled by ${rec.method.replace(/_/g, " ")}${rec.variance != null ? ` · spread ${rec.variance.toFixed(1)}` : ""}.` :
               `Raters diverge (spread ${rec.variance?.toFixed(1)}). A third rating will break the tie.`}
            </div>
          )}
          {canRate && !alreadyRated && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn gold sm" onClick={submitRating} disabled={rateBusy}>{rateBusy ? "Submitting…" : "Submit my rating (uses the scores below)"}</button>
              {rateMsg && <span className="tiny" style={{ color: rateMsg.includes("saved") ? "#8fd6a8" : "#ffb4b4" }}>{rateMsg}</span>}
            </div>
          )}
          {alreadyRated && <div className="tiny muted">You have rated this story.</div>}
        </div>
      )}
      {INDEX_META.map((idx) => (
        <div key={idx.key} className="card pad">
          <div className="mini" style={{ marginBottom: 12 }}>{idx.key} · {idx.name}</div>
          <div className="stack">
            {idx.indicators.map((it) => (
              <div key={it.key}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{it.label}</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map((n) => (
                      <button key={n} disabled={!editable} onClick={() => setVal(it.key, n)}
                        className={"btn sm " + (ind[it.key] === n ? "gold" : "ghost")}
                        style={{ minWidth: 34, justifyContent: "center", opacity: editable ? 1 : 0.7 }}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="tiny muted">{it.anchors[ind[it.key]]}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card pad stack">
        <div>
          <label className="f">Scoring notes <span className="muted">(the reasoning; shown before the number to readers)</span></label>
          <textarea className="in" value={notes} disabled={!editable} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} style={{ minHeight: 70 }} />
        </div>
        <div>
          <label className="f">Confidence</label>
          <select className="in" value={confidence} disabled={!editable} onChange={(e) => { setConfidence(e.target.value); setSaved(false); }} style={{ maxWidth: 200 }}>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="developing">Developing</option>
          </select>
        </div>
      </div>

      {editable && (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save score"}</button>
          {saved && <span className="tiny" style={{ color: "#8fd6a8" }}>Saved.</span>}
        </div>
      )}
    </div>
  );
}
