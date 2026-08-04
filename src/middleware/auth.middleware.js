const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');
const { prisma } = require('../utils/prisma');

/**
 * Middleware: verify JWT and attach userId to req.
 * Expects: Authorization: Bearer <token>
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists (handles deleted accounts)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });

    if (!user) throw new AppError('User no longer exists', 401);

    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired, please log in again', 401));
    }
    next(err);
  }
}

module.exports = { authenticate };
