/**
 * Wraps an async Express route handler to automatically catch
 * rejected promises and forward them to the next() error handler.
 *
 * Without this, unhandled async errors would crash the server.
 *
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
