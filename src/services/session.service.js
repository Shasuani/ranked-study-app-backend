const { prisma } = require('../utils/prisma');
const { AppError } = require('../utils/errors');
const rankService = require('./rank.service');

// Anti-cheat: allow 10 seconds tolerance for network latency
const COMPLETION_TOLERANCE_SECONDS = 10;

// ─── Start Session ───────────────────────────────────────────────────────────

/**
 * Start a new ranked study session.
 * Applies rank decay if user has been inactive for 7+ days.
 */
async function startSession(userId, { plannedDuration = 25 } = {}) {
  // Check for an already-active session (prevent multiple active sessions)
  const activeSession = await prisma.studySession.findFirst({
    where: { userId, status: 'ACTIVE' },
  });

  if (activeSession) {
    throw new AppError('You already have an active session. Complete or abandon it first.', 409);
  }

  // Apply rank decay before starting a new session
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const decayResult = rankService.applyRankDecay(
    user.rank, user.division, user.lp, user.lastSessionAt
  );

  // If decay changed rank/LP, persist it
  if (decayResult.decayed) {
    await prisma.user.update({
      where: { id: userId },
      data: { rank: decayResult.rank, division: decayResult.division, lp: decayResult.lp },
    });
  }

  const session = await prisma.studySession.create({
    data: {
      userId,
      plannedDuration,
      status: 'ACTIVE',
      rankBefore: decayResult.rank,
      divisionBefore: decayResult.division,
    },
  });

  return {
    session,
    decayApplied: decayResult.decayed,
    daysInactive: decayResult.daysInactive,
  };
}

// ─── Complete Session ────────────────────────────────────────────────────────

/**
 * Mark a session as successfully completed.
 *
 * Anti-cheat: validates that enough server-side time has passed
 * relative to the session's plannedDuration.
 */
async function completeSession(userId, sessionId) {
  const session = await getActiveSession(userId, sessionId);

  // ── Anti-Cheat Validation ─────────────────────────────────────────────────
  const now = new Date();
  const elapsedSeconds = (now - new Date(session.startTime)) / 1000;
  const requiredSeconds = session.plannedDuration * 60 - COMPLETION_TOLERANCE_SECONDS;

  if (elapsedSeconds < requiredSeconds) {
    const remainingSeconds = Math.ceil(requiredSeconds - elapsedSeconds);
    throw new AppError(
      `Session cannot be completed yet. ${remainingSeconds}s remaining.`,
      400,
      { remainingSeconds }
    );
  }

  const actualDurationMinutes = Math.floor(elapsedSeconds / 60);

  // ── Fetch current user state ──────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // ── Calculate rewards ─────────────────────────────────────────────────────
  const xpAwarded = rankService.calcXP(user.currentStreak);
  const lpGain = rankService.calcLPGain(user.currentStreak);

  // ── Apply LP change + handle promotion ───────────────────────────────────
  const rankResult = rankService.applyLPChange(user.rank, user.division, user.lp, lpGain);

  // ── Update streak ─────────────────────────────────────────────────────────
  const streakResult = rankService.updateStreakOnComplete(
    user.currentStreak, user.longestStreak, user.lastSessionAt
  );

  // ── Persist everything in a transaction ──────────────────────────────────
  const [updatedSession, updatedUser] = await prisma.$transaction([
    prisma.studySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime: now,
        actualDuration: actualDurationMinutes,
        xpAwarded,
        lpChange: lpGain,
        rankAfter: rankResult.rank,
        divisionAfter: rankResult.division,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        rank: rankResult.rank,
        division: rankResult.division,
        lp: rankResult.lp,
        totalXP: { increment: xpAwarded },
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        totalStudyHours: { increment: actualDurationMinutes / 60 },
        sessionsCompleted: { increment: 1 },
        lastSessionAt: now,
      },
      select: safeUserSelect(),
    }),
  ]);

  return {
    session: updatedSession,
    user: updatedUser,
    rewards: {
      xpAwarded,
      lpGain,
      promoted: rankResult.promoted,
      newRank: rankResult.rank,
      newDivision: rankResult.division,
    },
  };
}

// ─── Fail Session ────────────────────────────────────────────────────────────

/**
 * Mark a session as failed (user quit early).
 * Deducts LP, resets streak, handles demotion.
 */
async function failSession(userId, sessionId) {
  const session = await getActiveSession(userId, sessionId);

  const now = new Date();
  const elapsedSeconds = (now - new Date(session.startTime)) / 1000;
  const actualDurationMinutes = Math.floor(elapsedSeconds / 60);

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // ── Calculate penalty ─────────────────────────────────────────────────────
  const lpPenalty = rankService.calcLPPenalty(user.rank);

  // ── Apply LP loss + handle demotion ──────────────────────────────────────
  const rankResult = rankService.applyLPChange(user.rank, user.division, user.lp, -lpPenalty);

  // ── Persist in a transaction ──────────────────────────────────────────────
  const [updatedSession, updatedUser] = await prisma.$transaction([
    prisma.studySession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        endTime: now,
        actualDuration: actualDurationMinutes,
        xpAwarded: 0,
        lpChange: -lpPenalty,
        rankAfter: rankResult.rank,
        divisionAfter: rankResult.division,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        rank: rankResult.rank,
        division: rankResult.division,
        lp: rankResult.lp,
        currentStreak: 0, // Reset streak on failure
        sessionsFailed: { increment: 1 },
        lastSessionAt: now,
      },
      select: safeUserSelect(),
    }),
  ]);

  return {
    session: updatedSession,
    user: updatedUser,
    penalty: {
      lpLost: lpPenalty,
      demoted: rankResult.demoted,
      newRank: rankResult.rank,
      newDivision: rankResult.division,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getActiveSession(userId, sessionId) {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId, status: 'ACTIVE' },
  });

  if (!session) throw new AppError('Active session not found', 404);
  return session;
}

function safeUserSelect() {
  return {
    id: true, username: true, rank: true, division: true, lp: true,
    totalXP: true, currentStreak: true, longestStreak: true,
    totalStudyHours: true, sessionsCompleted: true, sessionsFailed: true,
  };
}

module.exports = { startSession, completeSession, failSession };
