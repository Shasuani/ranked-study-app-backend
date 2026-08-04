const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/prisma');
const { AppError } = require('../utils/errors');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Register a new user.
 */
async function register({ username, email, password }) {
  // Check for existing user
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    if (existing.email === email) throw new AppError('Email already in use', 409);
    throw new AppError('Username already taken', 409);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword },
    select: safeUserSelect(),
  });

  const token = generateToken(user.id);
  return { user, token };
}

/**
 * Login with email + password.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Generic error — don't reveal whether email exists
  if (!user) throw new AppError('Invalid credentials', 401);

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) throw new AppError('Invalid credentials', 401);

  const safeUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: safeUserSelect(),
  });

  const token = generateToken(user.id);
  return { user: safeUser, token };
}

/**
 * Sign a JWT for the given userId.
 */
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Prisma select object that excludes the password field.
 */
function safeUserSelect() {
  return {
    id: true,
    username: true,
    email: true,
    rank: true,
    division: true,
    lp: true,
    totalXP: true,
    currentStreak: true,
    longestStreak: true,
    totalStudyHours: true,
    sessionsCompleted: true,
    sessionsFailed: true,
    lastSessionAt: true,
    createdAt: true,
  };
}

module.exports = { register, login, generateToken, safeUserSelect };
