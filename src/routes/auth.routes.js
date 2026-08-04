const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// POST /auth/register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be 3–20 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  register
);

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

module.exports = router;
