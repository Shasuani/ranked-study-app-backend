/**
 * RankService
 * ============
 * Encapsulates ALL ranking, XP, LP, and promotion/demotion logic.
 *
 * Rank Ladder (lowest → highest):
 *   BRONZE IV → III → II → I
 *   SILVER IV → III → II → I
 *   GOLD   IV → III → II → I
 *   PLATINUM IV → III → II → I
 *   DIAMOND IV → III → II → I
 *   MASTER  (no divisions)
 *
 * LP Rules:
 *   - Range per division: 0–100
 *   - LP >= 100 → promote to next division/rank
 *   - LP < 0   → demote to previous division/rank (floor at BRONZE IV, LP=0)
 *   - MASTER   → LP is uncapped (just accumulates as score)
 */

// Ordered rank tiers — index used for math
const RANK_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'];

// Ordered divisions — index used for math (IV=0, I=3)
const DIVISION_ORDER = ['IV', 'III', 'II', 'I'];

// ─── XP & LP Formulas ───────────────────────────────────────────────────────

const BASE_XP = 100;           // XP for completing one 25-min session
const BASE_LP_GAIN = 20;       // LP gained for completing a session
const BASE_LP_PENALTY = 15;    // LP lost for failing a session

/**
 * Calculate XP awarded for completing a session.
 * Streak bonus: +10% per streak day, capped at +100%
 */
function calcXP(streak = 0) {
  const streakMultiplier = Math.min(1 + streak * 0.1, 2.0);
  return Math.floor(BASE_XP * streakMultiplier);
}

/**
 * Calculate LP gained for completing a session.
 * Streak bonus: +2 LP per streak day, capped at +20
 */
function calcLPGain(streak = 0) {
  const streakBonus = Math.min(streak * 2, 20);
  return BASE_LP_GAIN + streakBonus;
}

/**
 * Calculate LP penalty for failing/quitting a session early.
 * Higher ranks lose more LP on failure (punishment scales with rank tier).
 */
function calcLPPenalty(rank = 'BRONZE') {
  const rankIndex = RANK_ORDER.indexOf(rank);
  // Each rank tier adds 3 extra penalty LP
  return BASE_LP_PENALTY + rankIndex * 3;
}

// ─── Rank Position Helpers ──────────────────────────────────────────────────

/**
 * Convert rank + division to a flat numeric position.
 * Used for promotion/demotion math.
 * BRONZE IV = 0, BRONZE I = 3, SILVER IV = 4, ... MASTER = 20
 */
function toPosition(rank, division) {
  if (rank === 'MASTER') return RANK_ORDER.length * DIVISION_ORDER.length; // 20
  const rankIdx = RANK_ORDER.indexOf(rank);
  const divIdx = DIVISION_ORDER.indexOf(division);
  return rankIdx * DIVISION_ORDER.length + divIdx;
}

/**
 * Convert a flat numeric position back to { rank, division }.
 */
function fromPosition(position) {
  const masterPosition = RANK_ORDER.length * DIVISION_ORDER.length; // 20
  if (position >= masterPosition) {
    return { rank: 'MASTER', division: 'NONE' };
  }
  if (position < 0) {
    return { rank: 'BRONZE', division: 'IV' }; // Hard floor
  }
  const rankIdx = Math.floor(position / DIVISION_ORDER.length);
  const divIdx = position % DIVISION_ORDER.length;
  return {
    rank: RANK_ORDER[rankIdx],
    division: DIVISION_ORDER[divIdx],
  };
}

// ─── Core Rank Calculation ──────────────────────────────────────────────────

/**
 * Apply an LP change to a user and handle promotion/demotion.
 *
 * @param {string} currentRank     - e.g. 'GOLD'
 * @param {string} currentDivision - e.g. 'II'
 * @param {number} currentLP       - e.g. 75
 * @param {number} lpDelta         - positive (gain) or negative (penalty)
 * @returns {{ rank, division, lp, promoted, demoted }}
 */
function applyLPChange(currentRank, currentDivision, currentLP, lpDelta) {
  // MASTER has uncapped LP — no promotion/demotion needed
  if (currentRank === 'MASTER') {
    return {
      rank: 'MASTER',
      division: 'NONE',
      lp: Math.max(0, currentLP + lpDelta),
      promoted: false,
      demoted: false,
    };
  }

  let newLP = currentLP + lpDelta;
  let position = toPosition(currentRank, currentDivision);
  let promoted = false;
  let demoted = false;

  // ── Promotion chain ──────────────────────────────────────────────────────
  // Handle multiple promotions if LP carries over (e.g. from 95 + 25LP)
  while (newLP >= 100) {
    newLP -= 100;
    position += 1;
    promoted = true;

    // Cap at MASTER
    const masterPos = RANK_ORDER.length * DIVISION_ORDER.length;
    if (position >= masterPos) {
      position = masterPos;
      newLP = 0; // Reset LP at Master entry
      break;
    }
  }

  // ── Demotion chain ───────────────────────────────────────────────────────
  while (newLP < 0) {
    if (position <= 0) {
      // Hard floor: BRONZE IV cannot demote further
      newLP = 0;
      break;
    }
    position -= 1;
    newLP += 100; // Enter previous division at near-full LP
    demoted = true;
  }

  const { rank, division } = fromPosition(position);

  return { rank, division, lp: newLP, promoted, demoted };
}

// ─── Streak Logic ───────────────────────────────────────────────────────────

/**
 * Update streak counters after a COMPLETED session.
 * A streak increments if the user completed a session recently (within ~36h).
 *
 * @param {number}    currentStreak
 * @param {number}    longestStreak
 * @param {Date|null} lastSessionAt
 * @returns {{ currentStreak, longestStreak }}
 */
function updateStreakOnComplete(currentStreak, longestStreak, lastSessionAt) {
  const now = new Date();
  let newStreak = currentStreak;

  if (lastSessionAt) {
    const hoursSinceLast = (now - new Date(lastSessionAt)) / (1000 * 60 * 60);
    // Allow up to 36 hours between sessions to maintain streak
    if (hoursSinceLast <= 36) {
      newStreak = currentStreak + 1;
    } else {
      newStreak = 1; // Streak broken by gap, but today counts as day 1
    }
  } else {
    newStreak = 1; // First ever session
  }

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(longestStreak, newStreak),
  };
}

/**
 * Reset streak on FAILED session.
 */
function resetStreak() {
  return { currentStreak: 0 };
}

// ─── Rank Decay ─────────────────────────────────────────────────────────────

/**
 * Apply rank decay if user hasn't played in 7+ days.
 * Decay: -10 LP per day of inactivity beyond 7 days.
 * Only applies to Gold and above (Bronze/Silver are protected).
 *
 * @param {string}    rank
 * @param {string}    division
 * @param {number}    lp
 * @param {Date|null} lastSessionAt
 * @returns {{ rank, division, lp, decayed: boolean, daysInactive: number }}
 */
function applyRankDecay(rank, division, lp, lastSessionAt) {
  const PROTECTED_RANKS = ['BRONZE', 'SILVER'];
  if (PROTECTED_RANKS.includes(rank) || !lastSessionAt) {
    return { rank, division, lp, decayed: false, daysInactive: 0 };
  }

  const now = new Date();
  const daysSinceLast = (now - new Date(lastSessionAt)) / (1000 * 60 * 60 * 24);

  if (daysSinceLast < 7) {
    return { rank, division, lp, decayed: false, daysInactive: Math.floor(daysSinceLast) };
  }

  // -10 LP per day beyond the 7-day grace period
  const decayDays = Math.floor(daysSinceLast - 7);
  const lpPenalty = decayDays * 10;
  const result = applyLPChange(rank, division, lp, -lpPenalty);

  return {
    rank: result.rank,
    division: result.division,
    lp: result.lp,
    decayed: lpPenalty > 0,
    daysInactive: Math.floor(daysSinceLast),
  };
}

module.exports = {
  calcXP,
  calcLPGain,
  calcLPPenalty,
  applyLPChange,
  updateStreakOnComplete,
  resetStreak,
  applyRankDecay,
  RANK_ORDER,
  DIVISION_ORDER,
};
