/**
 * EDITORIAL THESIS — the core identity that governs what Dot 1 News selects,
 * how it frames stories, and what it refuses. This is the single source of
 * truth for the app's angle and voice, referenced by the writer prompt, the
 * story-selection gate, and the media matchers so that articles, reels, and
 * photojournalism all express one coherent editorial character.
 *
 * The thesis, in one line: Dot 1 News exists to help Christians engage the
 * news with discernment and hope — measured reporting seen through a biblical
 * lens — NOT to chase outrage, fear, or sensation.
 */

export const EDITORIAL_THESIS = {
  mission:
    'Dot 1 News helps followers of Jesus engage current events with discernment, ' +
    'clarity, and hope. We report what is true, weigh it through a biblical lens, ' +
    'and refuse the outrage economy. Our credibility rests on measured, verifiable ' +
    'reporting that treats every person with dignity.',

  voice:
    'Measured, calm, intellectually honest, and pastorally warm. Never sensational, ' +
    'never fearmongering, never partisan. We inform for stewardship and prayer, not ' +
    'for anxiety or tribal reaction.',

  // The governing paradigm — see "The Turning Toward" methodology. All media
  // is a turning of the reader's attention. Diversion turns attention AWAY
  // (toward the inflammatory, the tribal, the empty-urgent); we practice
  // CONVERSION — a turning TOWARD what is true, dignifying, and revelatory.
  paradigm:
    'Every story turns the reader\u2019s attention somewhere. We refuse diversion ' +
    '(turning attention away, toward outrage and fear) and practice conversion ' +
    '(turning attention toward what is true, dignifying, and revelatory). We do ' +
    'not chase the eye; we turn it toward the light.',

  // Stories that ADVANCE the thesis (favor these).
  favored:
    'faith and the church, human dignity and justice, the vulnerable and overlooked, ' +
    'moral and ethical questions, science and creation, cultural and family life, ' +
    'perseverance and hope, and consequential world events told with restraint.',

  // Framing DISCOURAGED — these are the "jarring headlines" to avoid amplifying.
  discouraged:
    'lurid crime detail, celebrity scandal, partisan point-scoring, fear-driven ' +
    'speculation, outrage bait, and sensational tragedy framed for shock rather ' +
    'than understanding.',
};

/**
 * THE FIVE TURNINGS — the operational disciplines of the Turning Toward
 * methodology. Each is a way a piece of media turns the reader TOWARD rather
 * than away. These are threaded into the writer prompt so the app's voice is
 * not just "measured" in the abstract but disciplined in five concrete ways.
 */
export const FIVE_TURNINGS = [
  'From Reaction to Reflection: slow the reader down. Do not ask how this ' +
    'makes them feel in three seconds; help them see what it means and what ' +
    'it asks of them.',
  'From Spectacle to Dignity: every person in the story bears the image of ' +
    'God, including the one the reader is invited to despise. Render the ' +
    'strongest honest version of each side, because contempt is a blindness.',
  'From Fragment to Frame: restore the context that makes a fact intelligible. ' +
    'A fact without a frame is not information but ammunition — give the ' +
    'why-now and name what remains unknown.',
  'From Noise to Signal: not everything true is worth attention today. Favor ' +
    'the consequential, dignifying, and formative; refuse the sensational-but-' +
    'empty even when it would perform.',
  'From Information to Revelation: do not stop at what happened. Through the ' +
    'closing reflection, invite the reader past information toward what the ' +
    'story discloses about the world, the neighbor, and God — ending with a ' +
    'question to carry, never a verdict imposed.',
];

/** Compact rendering of the Five Turnings for prompt injection. */
export function turningsForPrompt(): string {
  return FIVE_TURNINGS.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

/**
 * Sensational-headline signal words. When a source headline leans on these,
 * the story is either DE-SENSATIONALIZED in the rewrite or (if it has no
 * substance beyond the shock) skipped. This is not censorship of hard news —
 * a serious story about violence or tragedy can still run; what we drop is
 * framing engineered purely for a jolt.
 */
export const SENSATIONAL_SIGNALS = [
  'slams', 'slammed', 'blasts', 'destroys', 'obliterates', 'shocking', 'shock',
  'horror', 'terrifying', 'chaos', 'meltdown', 'explosive', 'bombshell', 'savage',
  'brutal', 'nightmare', 'outrage', 'fury', 'furious', 'rips', 'eviscerates',
  'you won\u2019t believe', 'jaw-dropping', 'stunning', 'sends shockwaves',
];

export function headlineSensationScore(title: string): number {
  const t = (title || '').toLowerCase();
  let hits = 0;
  for (const w of SENSATIONAL_SIGNALS) if (t.includes(w)) hits++;
  return hits;
}

/** Extremely sensational headlines (2+ signal words) with little else are
 *  skipped at selection time to protect the thesis. */
export function isTooSensational(title: string): boolean {
  return headlineSensationScore(title) >= 2;
}

/* ------------------------------------------------------------------ *
 * Editorial scope filter
 *
 * The paper's beat is deliberately narrow: Alaska first, then US politics
 * and religion, plus national stories that plausibly reach Alaska or the
 * whole country. A story must match at least one lane to be selected.
 *
 * This runs at candidate-selection time, on the headline (and any feed
 * tags/summary passed in). It is intentionally generous on the Alaska and
 * politics/faith lanes and stricter on everything else, so a routine world,
 * tech, or lifestyle item that has nothing to do with the beat is dropped.
 * ------------------------------------------------------------------ */

const ALASKA_TERMS = [
  'alaska', 'alaskan', 'anchorage', 'fairbanks', 'juneau', 'wasilla', 'palmer',
  'mat-su', 'matanuska', 'susitna', 'kenai', 'kodiak', 'sitka', 'ketchikan',
  'bethel', 'nome', 'utqiagvik', 'barrow', 'prudhoe', 'denali', 'aleutian',
  'arctic', 'permanent fund', 'pfd', 'north slope', 'iditarod', 'anwr',
  'murkowski', 'sullivan', 'dunleavy', 'peltola', 'alaska native', 'inupiat',
  'yupik', "yup'ik", 'tlingit', 'athabascan', 'aleut', 'bering',
];

const POLITICS_TERMS = [
  'congress', 'senate', 'house of representatives', 'white house', 'president',
  'biden', 'trump', 'supreme court', 'scotus', 'federal', 'legislation', 'bill',
  'governor', 'election', 'campaign', 'ballot', 'vote', 'republican', 'democrat',
  'gop', 'capitol', 'washington', 'policy', 'lawmakers', 'senator', 'governor',
  'department of', 'administration', 'cabinet', 'executive order', 'filibuster',
  'impeach', 'nomination', 'confirmation', 'primary', 'midterm', 'referendum',
  'legislature', 'statehouse', 'attorney general', 'pentagon', 'state department',
];

const FAITH_TERMS = [
  'church', 'christian', 'christianity', 'faith', 'jesus', 'christ', 'gospel',
  'bible', 'biblical', 'scripture', 'pastor', 'ministry', 'congregation',
  'religious', 'religion', 'catholic', 'protestant', 'evangelical', 'baptist',
  'denomination', 'worship', 'prayer', 'clergy', 'missionary', 'theology',
  'diocese', 'parish', 'sermon', 'chaplain', 'persecution', 'revival',
  'discipleship', 'sanctity', 'pro-life', 'religious liberty', 'first amendment',
];

// National-reach signals: a story with no local hook can still qualify if it
// plainly affects the whole country (and therefore Alaska too).
const NATIONAL_REACH_TERMS = [
  'nationwide', 'across the country', 'americans', 'u.s. economy', 'us economy',
  'inflation', 'interest rate', 'federal reserve', 'gas prices', 'fuel prices',
  'national security', 'immigration', 'border', 'tariff', 'supreme court',
  'social security', 'medicare', 'medicaid', 'veterans', 'military', 'defense',
  'oil', 'energy', 'fisheries', 'climate policy', 'public lands',
];

function anyTermIn(haystack: string, terms: string[]): boolean {
  for (const t of terms) if (haystack.includes(t)) return true;
  return false;
}

/**
 * Returns true if a story fits the paper's beat. `category` is the feed's
 * own category, used as a soft signal (faith/politics feeds lean in-scope
 * even when the headline is terse).
 */
export function isInScope(
  title: string,
  opts: { category?: string; summary?: string; tags?: string[] } = {},
): boolean {
  const hay = [title, opts.summary || '', ...(opts.tags || [])].join(' ').toLowerCase();

  // Lane 1: anything Alaska is always in scope.
  if (anyTermIn(hay, ALASKA_TERMS)) return true;

  // Lane 2: US politics — headline signals, or a politics-category feed.
  if (anyTermIn(hay, POLITICS_TERMS)) return true;
  if (opts.category === 'politics') return true;

  // Lane 3: religion — headline signals, or a faith-category feed.
  if (anyTermIn(hay, FAITH_TERMS)) return true;
  if (opts.category === 'faith') return true;

  // Lane 4: national-reach stories that affect the whole country (and AK).
  if (anyTermIn(hay, NATIONAL_REACH_TERMS)) return true;

  // Everything else (routine world/tech/culture/health/business/lifestyle) is
  // out of scope for this paper.
  return false;
}
