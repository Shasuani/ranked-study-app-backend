const userService = require('../services/user.service');
const { asyncHandler } = require('../utils/asyncHandler');

/** GET /users/me */
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.userId);
  res.json({ success: true, data: user });
});

/** GET /users/stats */
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userService.getUserStats(req.userId);
  res.json({ success: true, data: stats });
});

/** GET /users/sessions */
const getSessionHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await userService.getSessionHistory(req.userId, {
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 20, 100),
  });
  res.json({ success: true, data: result });
});

/** GET /users/weekly */
const getWeeklySummary = asyncHandler(async (req, res) => {
  const summary = await userService.getWeeklySummary(req.userId);
  res.json({ success: true, data: summary });
});

/** GET /leaderboard */
const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await userService.getLeaderboard();
  res.json({ success: true, data: leaderboard });
});

module.exports = { getMe, getUserStats, getSessionHistory, getWeeklySummary, getLeaderboard };
