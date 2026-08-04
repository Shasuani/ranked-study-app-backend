const { AppError } = require('../utils/errors');

/**
 * Global error handler.
 * Express identifies error handlers by their 4-argument signature (err, req, res, next).
 */
function errorHandler(err, req, res, next) {
  // Log the error (use a proper logger in production like winston/pino)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  } else {
    console.error(`❌ ${err.statusCode || 500}: ${err.message}`);
  }

  // Known operational errors (safe to expose to client)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.meta && { meta: err.meta }),
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'A record with that value already exists',
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }

  // Unknown / programmer errors — don't leak internals in production
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

module.exports = { errorHandler, notFoundHandler };
