const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * POST /auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const result = await authService.register({ username, email, password });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: result,
  });
});

/**
 * POST /auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
});

module.exports = { register, login };
