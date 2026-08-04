const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const sessionRoutes = require('./routes/session.routes');
const userRoutes = require('./routes/user.routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());

// Rate limiting — protect against brute force
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ─── Request Parsing ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Logging ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/users', userRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
