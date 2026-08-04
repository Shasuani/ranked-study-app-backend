const { validationResult } = require('express-validator');

/**
 * Middleware: collects express-validator errors and returns 422 if any exist.
 * Place after validation chain, before the controller.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validate };
