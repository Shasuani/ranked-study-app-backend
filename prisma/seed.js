/**
 * Seed Script — populates the database with test users and sessions.
 * Run with: npm run db:seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RANKS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data

  const password = await bcrypt.hash('password123', 10);

  // Create a test admin/demo user
  const demoUser = await prisma.user.create({
    data: {
      username: 'StudyChampion',
      email: 'demo@ranked.study',
      password,
      rank: 'GOLD',
      division: 'II',
      lp: 65,
      totalXP: 4800,
      currentStreak: 5,
      longestStreak: 12,
      totalStudyHours: 48.5,
      sessionsCompleted: 32,
      sessionsFailed: 8,
      lastSessionAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  console.log(`✅ Created demo user: ${demoUser.username} (${demoUser.email} / password123)`);

  // Create 15 random leaderboard users
  const users = [];
  for (let i = 0; i < 15; i++) {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const division = rank === 'MASTER' ? 'NONE' : DIVISIONS[Math.floor(Math.random() * DIVISIONS.length)];
    const completed = Math.floor(Math.random() * 100) + 5;
    const failed = Math.floor(Math.random() * 20);

    const user = await prisma.user.create({
      data: {
        username: `Player${i + 1}_${rank.slice(0, 3)}`,
        email: `player${i + 1}@ranked.study`,
        password,
        rank,
        division,
        lp: Math.floor(Math.random() * 100),
        totalXP: completed * (80 + Math.floor(Math.random() * 60)),
        currentStreak: Math.floor(Math.random() * 10),
        longestStreak: Math.floor(Math.random() * 20) + 5,
        totalStudyHours: parseFloat((completed * 0.42).toFixed(2)),
        sessionsCompleted: completed,
        sessionsFailed: failed,
        lastSessionAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
      },
    });
    users.push(user);
  }

  console.log(`✅ Created ${users.length} leaderboard users`);

  // Create some session history for demo user
  const sessionStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED', 'COMPLETED'];
  for (let i = 0; i < 5; i++) {
    const status = sessionStatuses[i];
    const start = new Date(Date.now() - (i + 1) * 26 * 60 * 1000);
    const end = new Date(start.getTime() + 25 * 60 * 1000);

    await prisma.studySession.create({
      data: {
        userId: demoUser.id,
        startTime: start,
        endTime: end,
        plannedDuration: 25,
        actualDuration: status === 'COMPLETED' ? 25 : Math.floor(Math.random() * 15) + 1,
        status,
        xpAwarded: status === 'COMPLETED' ? 100 + i * 10 : 0,
        lpChange: status === 'COMPLETED' ? 20 : -15,
        rankBefore: 'GOLD',
        divisionBefore: 'II',
        rankAfter: 'GOLD',
        divisionAfter: 'II',
      },
    });
  }

  console.log('✅ Created session history for demo user');
  console.log('\n🎉 Seed complete!');
  console.log('   Login: demo@ranked.study / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
