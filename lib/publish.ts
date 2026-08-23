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

// ---- Media publishing -------------------------------------------------------------------------
// Standalone photos and videos publish into the news photos/videos tables, matching their schema
// (required NOT NULL columns filled with sensible fallbacks). Like stories, a published media item
// keeps a pointer (news_media_id) so re-publishing updates the same news row.

export interface MediaRow {
  id: string;
  kind: string;
  url: string;
  thumbnail_url: string;
  title: string;
  caption: string;
  description: string;
  location: string;
  credit: string;
  category: string;
  duration: string;
  tags: any;
  news_media_id: string | null;
}

const PHOTO_CATEGORIES = new Set(["conflict", "humanitarian", "environment", "culture", "sports", "wildlife", "urban", "faith"]);
const VIDEO_CATEGORIES = new Set(["documentary", "interview", "investigation", "testimony", "teaching", "news-report", "short-film"]);

export async function publishMediaToNews(m: MediaRow, credit: string): Promise<string> {
  assertNewsConfigured();
  const db = newsSql!;
  const now = new Date().toISOString();
  const tags: string[] = Array.isArray(m.tags) ? m.tags : [];
  const isUpdate = !!m.news_media_id;

  if (m.kind === "video") {
    const category = VIDEO_CATEGORIES.has(m.category) ? m.category : "news-report";
    const newsId = m.news_media_id || `vid_${crypto.randomBytes(9).toString("base64url")}`;
    const title = m.title || m.caption || "Untitled";
    const description = m.description || m.caption || title;
    const thumb = m.thumbnail_url || m.url;
    const duration = m.duration || "0:00";
    if (isUpdate) {
      await db`UPDATE videos SET title = ${title}, description = ${description}, thumbnail = ${thumb},
        video_url = ${m.url}, duration = ${duration}, category = ${category}, producer = ${credit},
        tags = ${tags}, updated_at = now() WHERE id = ${newsId}`;
    } else {
      await db`INSERT INTO videos (id, title, description, thumbnail, video_url, duration, category, producer, tags, status, date, published_at)
        VALUES (${newsId}, ${title}, ${description}, ${thumb}, ${m.url}, ${duration}, ${category}, ${credit}, ${tags}, 'published', ${now}, ${now})`;
    }
    return newsId;
  }

  // photo
  const category = PHOTO_CATEGORIES.has(m.category) ? m.category : null;
  const newsId = m.news_media_id || `pho_${crypto.randomBytes(9).toString("base64url")}`;
  const caption = m.caption || m.title || "Untitled";
  const location = m.location || "Unknown";
  if (isUpdate) {
    await db`UPDATE photos SET image = ${m.url}, caption = ${caption}, full_description = ${m.description || ""},
      location = ${location}, photographer = ${credit}, category = ${category}, tags = ${tags},
      updated_at = now() WHERE id = ${newsId}`;
  } else {
    await db`INSERT INTO photos (id, image, caption, full_description, location, photographer, category, tags, status, date, published_at)
      VALUES (${newsId}, ${m.url}, ${caption}, ${m.description || ""}, ${location}, ${credit}, ${category}, ${tags}, 'published', ${now}, ${now})`;
  }
  return newsId;
}
