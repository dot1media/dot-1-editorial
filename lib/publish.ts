import { newsSql, assertNewsConfigured } from "@/lib/db";
import { IndicatorScores, computeIndexTotals, normalizeIndicators } from "@/lib/scoring";
import crypto from "crypto";

// Publishing writes into the SEPARATE news database (news.dot1.media), matching its news_stories
// schema exactly. Editorial owns the working record; news owns the published article. We map the
// D1-4LS indicators onto the twenty bai_/psi_/sci_/hii_ columns, derive the four 0-10 index totals
// (and the legacy 0-10 fields) from them, and set the D1-4LS metadata. A published story keeps a
// pointer back (news_story_id) so corrections update the same news row instead of duplicating.

export interface EditorialStoryRow {
  id: string;
  slug: string | null;
  final_headline: string | null;
  working_headline: string;
  summary: string;
  body: string;
  classification: string;
  category: string;
  hero_image: string;
  scores: any;
  score_confidence: string | null;
  author_name?: string | null;
  reporter_email?: string | null;
  news_story_id?: string | null;
}

const CLASSIFICATION_TO_FORMAT: Record<string, string> = {
  news: "article",
  analysis: "analysis",
  opinion: "opinion",
};

function wordCount(s: string): number {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

function prepare(story: EditorialStoryRow) {
  const headline = (story.final_headline || story.working_headline || "").trim();
  const summary = (story.summary || "").trim() || headline;
  const content = (story.body || "").trim() || summary;
  const image = (story.hero_image || "").trim() || "https://news.dot1.media/placeholder.jpg";
  const ind = normalizeIndicators(story.scores?.indicators || {});
  const totals = computeIndexTotals(ind);
  const wc = wordCount(content);
  return {
    headline, summary, content, image,
    category: story.category || "world",
    format: CLASSIFICATION_TO_FORMAT[story.classification] || "article",
    wc, readMin: Math.max(1, Math.round(wc / 200)),
    ind, confidence: story.score_confidence || "developing",
    bai: totals.biblicalAlignment, psi: totals.propheticSignificance,
    sci: totals.sourceCredibility, hii: totals.humanities,
  };
}

export async function publishToNews(
  story: EditorialStoryRow,
  authorLabel: string
): Promise<{ newsStoryId: string; totalScore: number }> {
  assertNewsConfigured();
  const db = newsSql!;
  const p = prepare(story);
  const i = p.ind;
  const total = p.bai + p.psi + p.sci + p.hii;
  const isUpdate = !!story.news_story_id;
  const newsId = story.news_story_id || `news_${crypto.randomBytes(9).toString("base64url")}`;
  const now = new Date().toISOString();

  if (isUpdate) {
    await db`UPDATE news_stories SET
      title = ${p.headline}, summary = ${p.summary}, content = ${p.content}, image = ${p.image},
      category = ${p.category}, content_format = ${p.format}, word_count = ${p.wc}, reading_time_minutes = ${p.readMin},
      biblical_alignment = ${p.bai}, prophetic_significance = ${p.psi}, source_credibility = ${p.sci}, humanities = ${p.hii},
      bai_scriptural_consistency = ${i.baiScripturalConsistency}, bai_doctrinal_integrity = ${i.baiDoctrinalIntegrity},
      bai_moral_framework = ${i.baiMoralFramework}, bai_anthropology = ${i.baiAnthropology}, bai_teleology = ${i.baiTeleology},
      psi_textual_linkage = ${i.psiTextualLinkage}, psi_eschatological_fit = ${i.psiEschatologicalFit},
      psi_historical_continuity = ${i.psiHistoricalContinuity}, psi_spiritual_impact = ${i.psiSpiritualImpact},
      psi_theological_restraint = ${i.psiTheologicalRestraint},
      sci_primary_source_access = ${i.sciPrimarySourceAccess}, sci_verification = ${i.sciVerification},
      sci_transparency = ${i.sciTransparency}, sci_track_record = ${i.sciTrackRecord}, sci_editorial_standards = ${i.sciEditorialStandards},
      hii_human_dignity = ${i.hiiHumanDignity}, hii_compassion_empathy = ${i.hiiCompassionEmpathy},
      hii_societal_impact = ${i.hiiSocietalImpact}, hii_justice_responsibility = ${i.hiiJusticeResponsibility},
      hii_christ_modeled_care = ${i.hiiChristModeledCare},
      score_confidence = ${p.confidence}, status = 'published', updated_at = now()
      WHERE id = ${newsId}`;
    return { newsStoryId: newsId, totalScore: total };
  }

  await db`INSERT INTO news_stories (
      id, title, summary, content, image, category, author, tags,
      content_format, word_count, reading_time_minutes,
      biblical_alignment, prophetic_significance, source_credibility, humanities,
      bai_scriptural_consistency, bai_doctrinal_integrity, bai_moral_framework, bai_anthropology, bai_teleology,
      psi_textual_linkage, psi_eschatological_fit, psi_historical_continuity, psi_spiritual_impact, psi_theological_restraint,
      sci_primary_source_access, sci_verification, sci_transparency, sci_track_record, sci_editorial_standards,
      hii_human_dignity, hii_compassion_empathy, hii_societal_impact, hii_justice_responsibility, hii_christ_modeled_care,
      score_confidence, status, date, published_at
    ) VALUES (
      ${newsId}, ${p.headline}, ${p.summary}, ${p.content}, ${p.image}, ${p.category}, ${authorLabel}, ${[] as string[]},
      ${p.format}, ${p.wc}, ${p.readMin},
      ${p.bai}, ${p.psi}, ${p.sci}, ${p.hii},
      ${i.baiScripturalConsistency}, ${i.baiDoctrinalIntegrity}, ${i.baiMoralFramework}, ${i.baiAnthropology}, ${i.baiTeleology},
      ${i.psiTextualLinkage}, ${i.psiEschatologicalFit}, ${i.psiHistoricalContinuity}, ${i.psiSpiritualImpact}, ${i.psiTheologicalRestraint},
      ${i.sciPrimarySourceAccess}, ${i.sciVerification}, ${i.sciTransparency}, ${i.sciTrackRecord}, ${i.sciEditorialStandards},
      ${i.hiiHumanDignity}, ${i.hiiCompassionEmpathy}, ${i.hiiSocietalImpact}, ${i.hiiJusticeResponsibility}, ${i.hiiChristModeledCare},
      ${p.confidence}, 'published', ${now}, ${now}
    )`;
  return { newsStoryId: newsId, totalScore: total };
}

// Unpublish: archive the news row so it drops out of the reader feed without deleting history.
export async function unpublishFromNews(newsStoryId: string): Promise<void> {
  assertNewsConfigured();
  await newsSql!`UPDATE news_stories SET status = 'archived', updated_at = now() WHERE id = ${newsStoryId}`;
}

// ---- Media publishing ---------------------------------------------------------------------------
// Publish a media asset into the news database: images into photos, videos into videos. Required
// NOT NULL columns are always given a value; category/style are validated by the news CHECK
// constraints, so callers must pass values from the news vocabularies (PHOTO_/VIDEO_ constants).

export interface MediaRow {
  id: string;
  kind: string;
  blob_url: string;
  thumb_url: string;
  title: string;
  caption: string;
  description: string;
  credit: string;
  location: string;
  category: string;
  media_style: string;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  mime: string;
  news_id: string | null;
}

function fmtDuration(sec: number | null): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export async function publishMediaToNews(m: MediaRow, credit: string): Promise<{ newsId: string }> {
  assertNewsConfigured();
  const db = newsSql!;
  const now = new Date().toISOString();
  const isUpdate = !!m.news_id;

  if (m.kind === "image") {
    const newsId = m.news_id || `photo_${crypto.randomBytes(9).toString("base64url")}`;
    const imgFormat = m.mime.includes("png") ? "png" : m.mime.includes("webp") ? "webp" : "jpeg";
    const caption = (m.caption || m.title || "Untitled").slice(0, 500);
    const location = m.location || "Unknown";
    const photographer = credit || m.credit || "Dot 1 News";
    const category = m.category || null; // photos.category is nullable
    const style = m.media_style || "documentary";
    if (isUpdate) {
      await db`UPDATE photos SET image = ${m.blob_url}, caption = ${caption}, full_description = ${m.description || ""},
        location = ${location}, photographer = ${photographer}, image_format = ${imgFormat},
        photo_style = ${style}, category = ${category}, image_width = ${m.width}, image_height = ${m.height},
        status = 'published', updated_at = now() WHERE id = ${newsId}`;
    } else {
      await db`INSERT INTO photos (id, image, caption, full_description, location, photographer,
        image_format, photo_style, category, image_width, image_height, status, date, published_at)
        VALUES (${newsId}, ${m.blob_url}, ${caption}, ${m.description || ""}, ${location}, ${photographer},
        ${imgFormat}, ${style}, ${category}, ${m.width}, ${m.height}, 'published', ${now}, ${now})`;
    }
    return { newsId };
  }

  // video
  const newsId = m.news_id || `video_${crypto.randomBytes(9).toString("base64url")}`;
  const vFormat = m.mime.includes("webm") ? "webm" : "mp4";
  const title = (m.title || m.caption || "Untitled").slice(0, 300);
  const description = m.description || m.caption || title;
  const thumb = m.thumb_url || m.blob_url;
  const category = m.category || "news-report";
  const style = m.media_style || "documentary";
  const duration = fmtDuration(m.duration_seconds);
  if (isUpdate) {
    await db`UPDATE videos SET title = ${title}, description = ${description}, thumbnail = ${thumb},
      video_url = ${m.blob_url}, duration = ${duration}, duration_seconds = ${m.duration_seconds},
      video_format = ${vFormat}, category = ${category}, video_style = ${style}, producer = ${credit},
      status = 'published', updated_at = now() WHERE id = ${newsId}`;
  } else {
    await db`INSERT INTO videos (id, title, description, thumbnail, video_url, duration, duration_seconds,
      video_format, category, video_style, producer, status, date, published_at)
      VALUES (${newsId}, ${title}, ${description}, ${thumb}, ${m.blob_url}, ${duration}, ${m.duration_seconds},
      ${vFormat}, ${category}, ${style}, ${credit}, 'published', ${now}, ${now})`;
  }
  return { newsId };
}
