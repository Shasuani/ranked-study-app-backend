const express = require('express');
const { body } = require('express-validator');
const { startSession, completeSession, failSession } = require('../controllers/session.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// All session routes require authentication
router.use(authenticate);

// POST /sessions/start
router.post(
  '/start',
  [
    body('plannedDuration')
      .optional()
      .isInt({ min: 1, max: 120 })
      .withMessage('plannedDuration must be between 1–120 minutes'),
  ],
  validate,
  startSession
);

// POST /sessions/complete
router.post(
  '/complete',
  [body('sessionId').notEmpty().withMessage('sessionId is required')],
  validate,
  completeSession
);

// POST /sessions/fail
router.post(
  '/fail',
  [body('sessionId').notEmpty().withMessage('sessionId is required')],
  validate,
  failSession
);

module.exports = router;
