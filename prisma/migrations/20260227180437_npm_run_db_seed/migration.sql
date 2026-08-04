-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER');

-- CreateEnum
CREATE TYPE "Division" AS ENUM ('IV', 'III', 'II', 'I', 'NONE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rank" "Rank" NOT NULL DEFAULT 'BRONZE',
    "division" "Division" NOT NULL DEFAULT 'IV',
    "lp" INTEGER NOT NULL DEFAULT 0,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalStudyHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sessionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "sessionsFailed" INTEGER NOT NULL DEFAULT 0,
    "lastSessionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "plannedDuration" INTEGER NOT NULL DEFAULT 25,
    "actualDuration" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "xpAwarded" INTEGER,
    "lpChange" INTEGER,
    "rankBefore" "Rank",
    "divisionBefore" "Division",
    "rankAfter" "Rank",
    "divisionAfter" "Division",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_rank_lp_idx" ON "User"("rank", "lp");

-- CreateIndex
CREATE INDEX "User_totalXP_idx" ON "User"("totalXP");

-- CreateIndex
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

-- CreateIndex
CREATE INDEX "StudySession_createdAt_idx" ON "StudySession"("createdAt");

-- CreateIndex
CREATE INDEX "StudySession_userId_createdAt_idx" ON "StudySession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
