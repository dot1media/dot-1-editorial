/**
 * Feed sources for the automated content pipeline.
 *
 * Each source maps to one of the app's news categories and carries an SCI
 * (Source Credibility Index) baseline. Three of the five SCI indicators are
 * properties of the OUTLET rather than the individual article — track
 * record, editorial standards, and transparency — so they are set here
 * deterministically instead of being guessed per-article. The remaining
 * two (primary-source access, verification) are assessed per article.
 *
 * Edit freely: add/remove feeds, tune baselines, or override the entire
 * list at deploy time with the PIPELINE_FEEDS env var (JSON array of
 * FeedSource). Feeds that fail to fetch are skipped and logged — a bad URL
 * never breaks the run.
 */

export type NewsCategory =
  | 'world' | 'politics' | 'faith' | 'culture'
  | 'technology' | 'health' | 'business' | 'environment';

export interface SciBaseline {
  /** 3.3 Transparency & accountability of the outlet (0–2) */
  transparency: 0 | 1 | 2;
  /** 3.4 Historical track-record accuracy of the outlet (0–2) */
  trackRecord: 0 | 1 | 2;
  /** 3.5 Editorial standards / methodology of the outlet (0–2) */
  editorialStandards: 0 | 1 | 2;
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: NewsCategory;
  sciBaseline: SciBaseline;
  enabled: boolean;
}

export const DEFAULT_FEEDS: FeedSource[] = [
  // ── Alaska — the paper's home beat (highest priority) ────────────────
  {
    id: 'adn',
    name: 'Anchorage Daily News',
    url: 'https://www.adn.com/arc/outboundfeeds/rss/',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'alaska-public',
    name: 'Alaska Public Media',
    url: 'https://alaskapublic.org/feed/',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'alaska-beacon',
    name: 'Alaska Beacon',
    url: 'https://alaskabeacon.com/feed/',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'ktoo',
    name: 'KTOO — Juneau',
    url: 'https://www.ktoo.org/feed/',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'ktuu',
    name: 'Alaska\'s News Source (KTUU)',
    url: 'https://www.alaskasnewssource.com/arc/outboundfeeds/rss/',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 1, editorialStandards: 1 },
    enabled: true,
  },
  {
    id: 'ktva-fairbanks',
    name: 'Fairbanks Daily News-Miner',
    url: 'https://www.newsminer.com/search/?f=rss&t=article&c=news&l=50&s=start_time&sd=desc',
    category: 'politics',
    sciBaseline: { transparency: 1, trackRecord: 1, editorialStandards: 1 },
    enabled: true,
  },
  {
    id: 'must-read-alaska',
    name: 'Must Read Alaska',
    url: 'https://mustreadalaska.com/feed/',
    category: 'politics',
    sciBaseline: { transparency: 1, trackRecord: 1, editorialStandards: 1 },
    enabled: true,
  },
  {
    id: 'kyuk',
    name: 'KYUK — Bethel',
    url: 'https://www.kyuk.org/feed/',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 1, editorialStandards: 1 },
    enabled: true,
  },

  {
    id: 'bbc-world',
    name: 'BBC News — World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'world',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'npr-politics',
    name: 'NPR — Politics',
    url: 'https://feeds.npr.org/1014/rss.xml',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'rns',
    name: 'Religion News Service',
    url: 'https://religionnews.com/feed/',
    category: 'faith',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'cbn-news',
    name: 'CBN News',
    url: 'https://www1.cbn.com/rss-cbn-articles-cbnnews.xml',
    category: 'faith',
    sciBaseline: { transparency: 1, trackRecord: 1, editorialStandards: 1 },
    enabled: true,
  },
  {
    id: 'guardian-culture',
    name: 'The Guardian — Culture',
    url: 'https://www.theguardian.com/culture/rss',
    category: 'culture',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'technology',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'bbc-health',
    name: 'BBC News — Health',
    url: 'https://feeds.bbci.co.uk/news/health/rss.xml',
    category: 'health',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'bbc-business',
    name: 'BBC News — Business',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    category: 'business',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'guardian-environment',
    name: 'The Guardian — Environment',
    url: 'https://www.theguardian.com/environment/rss',
    category: 'environment',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },

  // ── Expanded roster ──────────────────────────────────────────────────
  // Added for breadth across every category. SCI baselines are honest,
  // outlet-level starting points (transparency / track record / editorial
  // standards, each 0–2); adjust any as your own assessment refines.

  // World
  {
    id: 'nbc-world',
    name: 'NBC News — World',
    url: 'https://feeds.nbcnews.com/nbcnews/public/world',
    category: 'world',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'npr-world',
    name: 'NPR — World',
    url: 'https://feeds.npr.org/1004/rss.xml',
    category: 'world',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'aljazeera',
    name: 'Al Jazeera — All',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    category: 'world',
    sciBaseline: { transparency: 2, trackRecord: 1, editorialStandards: 2 },
    enabled: false,
  },

  // Faith (broadened, spanning traditions and editorial postures)
  {
    id: 'christianity-today',
    name: 'Christianity Today',
    url: 'https://www.christianitytoday.com/rss/',
    category: 'faith',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'the-gospel-coalition',
    name: 'The Gospel Coalition',
    url: 'https://www.thegospelcoalition.org/feed/',
    category: 'faith',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 1 },
    enabled: true,
  },
  {
    id: 'catholic-news-agency',
    name: 'Catholic News Agency',
    url: 'https://www.catholicnewsagency.com/rss/news.xml',
    category: 'faith',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },
  {
    id: 'baptist-press',
    name: 'Baptist Press',
    url: 'https://www.baptistpress.com/feed/',
    category: 'faith',
    sciBaseline: { transparency: 1, trackRecord: 1, editorialStandards: 1 },
    enabled: true,
  },

  // Politics
  {
    id: 'thehill',
    name: 'The Hill',
    url: 'https://thehill.com/news/feed/',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 1 },
    enabled: true,
  },
  {
    id: 'pbs-politics',
    name: 'PBS NewsHour — Politics',
    url: 'https://www.pbs.org/newshour/feeds/rss/politics',
    category: 'politics',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: true,
  },

  // Culture
  {
    id: 'npr-culture',
    name: 'NPR — Culture',
    url: 'https://feeds.npr.org/1008/rss.xml',
    category: 'culture',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },

  // Technology
  {
    id: 'the-verge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'technology',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'technology',
    sciBaseline: { transparency: 2, trackRecord: 1, editorialStandards: 1 },
    enabled: false,
  },

  // Health
  {
    id: 'npr-health',
    name: 'NPR — Health Shots',
    url: 'https://feeds.npr.org/1128/rss.xml',
    category: 'health',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },

  // Business
  {
    id: 'npr-business',
    name: 'NPR — Business',
    url: 'https://feeds.npr.org/1006/rss.xml',
    category: 'business',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },

  // Environment / Science
  {
    id: 'nasa-news',
    name: 'NASA — Breaking News',
    url: 'https://www.nasa.gov/feed/',
    category: 'environment',
    sciBaseline: { transparency: 2, trackRecord: 2, editorialStandards: 2 },
    enabled: false,
  },
];

/** Category → fallback hero image (matches the visual style already used in-app). */
/**
 * Fallback image POOLS by category. When an RSS item carries no image, one
 * of these is chosen deterministically per-article (hashed from the article
 * link) so that imageless stories in the same category don't all share one
 * identical photo. Deterministic selection means the same article always
 * gets the same fallback (stable across re-runs), while different articles
 * spread across the pool.
 */
export const CATEGORY_FALLBACK_POOLS: Record<NewsCategory, string[]> = {
  world: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1492962827063-e5ea0d8c01f5?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=1600&q=80&auto=format',
  ],
  politics: [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1575320181282-9afab399332c?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1591189863430-ab87e120f312?w=1600&q=80&auto=format',
  ],
  faith: [
    'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1490127252417-7c393f993ee4?w=1600&q=80&auto=format',
  ],
  culture: [
    'https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80&auto=format',
  ],
  technology: [
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80&auto=format',
  ],
  health: [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=1600&q=80&auto=format',
  ],
  business: [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=1600&q=80&auto=format',
  ],
  environment: [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1600&q=80&auto=format',
    'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1600&q=80&auto=format',
  ],
};

/** Deterministic per-article fallback image: same link → same image, but
 *  different links spread across the category pool. */
export function fallbackImageFor(category: NewsCategory, seed: string): string {
  const pool = CATEGORY_FALLBACK_POOLS[category] || CATEGORY_FALLBACK_POOLS.world;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return pool[Math.abs(hash) % pool.length];
}

/** Back-compat: the old single-image map, now sourced from the pools. */
export const CATEGORY_FALLBACK_IMAGES: Record<NewsCategory, string> = {
  world: CATEGORY_FALLBACK_POOLS.world[0],
  politics: CATEGORY_FALLBACK_POOLS.politics[0],
  faith: CATEGORY_FALLBACK_POOLS.faith[0],
  culture: CATEGORY_FALLBACK_POOLS.culture[0],
  technology: CATEGORY_FALLBACK_POOLS.technology[0],
  health: CATEGORY_FALLBACK_POOLS.health[0],
  business: CATEGORY_FALLBACK_POOLS.business[0],
  environment: CATEGORY_FALLBACK_POOLS.environment[0],
};

/** Resolve the active feed list: env override → defaults. */
export function getFeeds(): FeedSource[] {
  const raw = process.env.PIPELINE_FEEDS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`📡 Using ${parsed.length} feeds from PIPELINE_FEEDS env override`);
        return parsed as FeedSource[];
      }
    } catch (e: any) {
      console.error('❌ PIPELINE_FEEDS is not valid JSON — falling back to defaults:', e.message);
    }
  }
  return DEFAULT_FEEDS.filter((f) => f.enabled);
}
