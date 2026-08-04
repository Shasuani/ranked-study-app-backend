const express = require('express');
const { getMe, getUserStats, getSessionHistory, getWeeklySummary, getLeaderboard } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/leaderboard', getLeaderboard);

// Protected routes
router.use(authenticate);
router.get('/me', getMe);
router.get('/stats', getUserStats);
router.get('/sessions', getSessionHistory);
router.get('/weekly', getWeeklySummary);

module.exports = router;
