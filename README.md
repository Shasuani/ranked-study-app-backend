# 🍅 Ranked Study App — Backend

A production-ready gamified Pomodoro backend. Users complete study sessions to earn XP and LP (League Points), climb ranked tiers, and compete on a leaderboard.

---

## 📁 Project Structure

```
ranked-study-app/
├── prisma/
│   ├── schema.prisma        # Database schema + relations
│   └── seed.js              # Test data seeder
├── src/
│   ├── controllers/         # HTTP request handlers (thin layer)
│   │   ├── auth.controller.js
│   │   ├── session.controller.js
│   │   └── user.controller.js
│   ├── services/            # Business logic (fat layer)
│   │   ├── auth.service.js
│   │   ├── session.service.js
│   │   ├── rank.service.js  # All XP/LP/rank math lives here
│   │   └── user.service.js
│   ├── routes/              # Express routers + validation chains
│   │   ├── auth.routes.js
│   │   ├── session.routes.js
│   │   └── user.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT verification
│   │   ├── validate.middleware.js # express-validator error collector
│   │   └── error.middleware.js    # Global error handler
│   ├── utils/
│   │   ├── prisma.js        # Prisma singleton
│   │   ├── errors.js        # AppError class
│   │   └── asyncHandler.js  # Wraps async routes
│   ├── app.js               # Express app setup
│   └── server.js            # Entry point
├── .env.example
└── package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret
```

### 3. Set up the database
```bash
# Run migrations (creates tables)
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed with test data
npm run db:seed
```

### 4. Start the server
```bash
npm run dev       # development (nodemon)
npm start         # production
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint         | Auth | Description       |
|--------|-----------------|------|-------------------|
| POST   | /auth/register  | No   | Create account    |
| POST   | /auth/login     | No   | Get JWT token     |

### Sessions
| Method | Endpoint            | Auth | Description             |
|--------|---------------------|------|-------------------------|
| POST   | /sessions/start     | Yes  | Start a Pomodoro session|
| POST   | /sessions/complete  | Yes  | Complete session (+XP/LP)|
| POST   | /sessions/fail      | Yes  | Quit early (-LP)        |

### Users
| Method | Endpoint         | Auth | Description              |
|--------|-----------------|------|--------------------------|
| GET    | /users/me       | Yes  | My profile               |
| GET    | /users/stats    | Yes  | Stats + session history  |
| GET    | /users/sessions | Yes  | Paginated session history|
| GET    | /users/weekly   | Yes  | 7-day performance summary|
| GET    | /leaderboard    | No   | Top 50 players           |

---

## 🎮 Game Logic

### Rank Ladder
```
BRONZE IV → III → II → I
SILVER IV → III → II → I
GOLD   IV → III → II → I
PLATINUM IV → III → II → I
DIAMOND IV → III → II → I
MASTER (no divisions, uncapped LP)
```

### XP Formula
```
XP = BASE_XP(100) × min(1 + streak × 0.1, 2.0)
```
- No streak: 100 XP
- 5-day streak: 150 XP
- 10+ day streak: 200 XP (cap)

### LP Gain Formula
```
LP Gain = 20 + min(streak × 2, 20)
```
- No streak: +20 LP
- 10+ day streak: +40 LP (cap)

### LP Penalty Formula
```
LP Penalty = 15 + (rankTier × 3)
```
- Bronze failure: -15 LP
- Master failure: -30 LP

### Rank Decay
- Grace period: 7 days
- After 7 days: -10 LP per day of inactivity
- Bronze and Silver are **protected** from decay

### Anti-Cheat
- Session `startTime` is set by the server, not the client
- `/sessions/complete` validates that `now - startTime >= plannedDuration - 10s`
- A client cannot fake a 25-minute session in 5 minutes

---

## 🧪 Quick Test (curl)

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Start session (use token from login)
curl -X POST http://localhost:3000/sessions/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plannedDuration":25}'

# Leaderboard (no auth)
curl http://localhost:3000/leaderboard
```
