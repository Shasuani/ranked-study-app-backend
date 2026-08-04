const { prisma } = require('../utils/prisma');
const { safeUserSelect } = require('./auth.service');
const { AppError } = require('../utils/errors');

/**
 * Get the current authenticated user's profile.
 */
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect(),
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

/**
 * Get detailed stats for the current user, including session history.
 */
async function getUserStats(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...safeUserSelect(),
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 20, // last 20 sessions
        select: {
          id: true, status: true, plannedDuration: true, actualDuration: true,
          xpAwarded: true, lpChange: true, rankBefore: true, rankAfter: true,
          divisionBefore: true, divisionAfter: true, createdAt: true,
        },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  // Compute win rate
  const total = user.sessionsCompleted + user.sessionsFailed;
  const winRate = total > 0 ? ((user.sessionsCompleted / total) * 100).toFixed(1) : 0;

  return { ...user, winRate: parseFloat(winRate) };
}

/**
 * Get session history with pagination.
 */
async function getSessionHistory(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, status: true, plannedDuration: true, actualDuration: true,
        xpAwarded: true, lpChange: true, rankBefore: true, rankAfter: true,
        divisionBefore: true, divisionAfter: true, startTime: true,
        endTime: true, createdAt: true,
      },
    }),
    prisma.studySession.count({ where: { userId } }),
  ]);

  return {
    sessions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get weekly performance summary for the last 7 days.
 */
async function getWeeklySummary(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessions = await prisma.studySession.findMany({
    where: { userId, createdAt: { gte: sevenDaysAgo } },
    select: {
      status: true, xpAwarded: true, lpChange: true,
      actualDuration: true, createdAt: true,
    },
  });

  // Group sessions by day
  const byDay = {};
  sessions.forEach((s) => {
    const day = s.createdAt.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = { completed: 0, failed: 0, xp: 0, minutesStudied: 0 };
    if (s.status === 'COMPLETED') {
      byDay[day].completed += 1;
      byDay[day].xp += s.xpAwarded || 0;
      byDay[day].minutesStudied += s.actualDuration || 0;
    } else if (s.status === 'FAILED') {
      byDay[day].failed += 1;
    }
  });

  const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
  const failed = sessions.filter((s) => s.status === 'FAILED').length;
  const totalXP = sessions.reduce((sum, s) => sum + (s.xpAwarded || 0), 0);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);

  return {
    period: { from: sevenDaysAgo.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
    summary: { completed, failed, totalXP, totalMinutes, totalHours: (totalMinutes / 60).toFixed(1) },
    dailyBreakdown: byDay,
  };
}

/**
 * Get the top 50 players by rank + LP.
 * Ordered by: rank tier DESC, division DESC, LP DESC.
 */
async function getLeaderboard() {
  const RANK_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'];
  const DIVISION_ORDER = ['IV', 'III', 'II', 'I'];

  const users = await prisma.user.findMany({
    take: 50,
    orderBy: [{ totalXP: 'desc' }], // fallback sort; we re-sort in JS
    select: {
      id: true, username: true, rank: true, division: true,
      lp: true, totalXP: true, currentStreak: true, sessionsCompleted: true,
    },
  });

  // Sort by rank position + LP (most accurate ranking)
  users.sort((a, b) => {
    const rankA = RANK_ORDER.indexOf(a.rank) * 400 +
      (a.division === 'NONE' ? 400 : DIVISION_ORDER.indexOf(a.division) * 100) + a.lp;
    const rankB = RANK_ORDER.indexOf(b.rank) * 400 +
      (b.division === 'NONE' ? 400 : DIVISION_ORDER.indexOf(b.division) * 100) + b.lp;
    return rankB - rankA;
  });

  return users.map((u, idx) => ({ position: idx + 1, ...u }));
}

module.exports = { getMe, getUserStats, getSessionHistory, getWeeklySummary, getLeaderboard };
