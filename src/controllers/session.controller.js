const sessionService = require('../services/session.service');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * POST /sessions/start
 */
const startSession = asyncHandler(async (req, res) => {
  const { plannedDuration } = req.body;
  const result = await sessionService.startSession(req.userId, { plannedDuration });

  res.status(201).json({
    success: true,
    message: 'Session started. Good luck! 🍅',
    data: result,
  });
});

/**
 * POST /sessions/complete
 */
const completeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const result = await sessionService.completeSession(req.userId, sessionId);

  const message = result.rewards.promoted
    ? `🎉 PROMOTED to ${result.rewards.newRank} ${result.rewards.newDivision}!`
    : `✅ Session complete! +${result.rewards.xpAwarded} XP, +${result.rewards.lpGain} LP`;

  res.json({
    success: true,
    message,
    data: result,
  });
});

/**
 * POST /sessions/fail
 */
const failSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const result = await sessionService.failSession(req.userId, sessionId);

  const message = result.penalty.demoted
    ? `⬇️ Demoted to ${result.penalty.newRank} ${result.penalty.newDivision}. Keep grinding!`
    : `❌ Session failed. -${result.penalty.lpLost} LP. Streak reset.`;

  res.json({
    success: true,
    message,
    data: result,
  });
});

module.exports = { startSession, completeSession, failSession };
