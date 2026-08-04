/**
 * Custom error class for operational errors (expected failures).
 * These are safe to expose to the client.
 *
 * Programmer/unexpected errors should throw regular Error objects
 * and will be caught by the global error handler.
 */
class AppError extends Error {
  /**
   * @param {string} message   - Human-readable error message
   * @param {number} statusCode - HTTP status code (default 400)
   * @param {object} meta      - Optional extra data to include in response
   */
  constructor(message, statusCode = 400, meta = null) {
    super(message);
    this.statusCode = statusCode;
    this.meta = meta;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };
