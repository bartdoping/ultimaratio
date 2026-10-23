-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "creatorCodeId" TEXT,
ADD COLUMN     "dailyGoal" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "lastReminderAt" TIMESTAMP(3),
ADD COLUMN     "proBonusUntil" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralRewardedAt" TIMESTAMP(3),
ADD COLUMN     "referredById" TEXT,
ADD COLUMN     "reminderOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderToken" TEXT;

-- AlterTable
ALTER TABLE "public"."GeneratorDailyUsage" ADD COLUMN     "poolCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."SavedQuestion" ADD COLUMN     "poolQuestionId" TEXT;

-- CreateTable
CREATE TABLE "public"."AiUsageEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "props" JSONB,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PoolQuestion" (
    "id" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'auto',
    "stem" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deepDive" TEXT,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "retiredReason" TEXT,
    "servedCount" INTEGER NOT NULL DEFAULT 0,
    "answeredCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoolQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PoolAnswer" (
    "id" TEXT NOT NULL,
    "poolQuestionId" TEXT NOT NULL,
    "userId" TEXT,
    "correct" BOOLEAN NOT NULL,
    "chosenIndex" INTEGER NOT NULL,
    "msToAnswer" INTEGER,
    "userAccuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PoolSeen" (
    "userId" TEXT NOT NULL,
    "poolQuestionId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolSeen_pkey" PRIMARY KEY ("userId","poolQuestionId")
);

-- CreateTable
CREATE TABLE "public"."UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreatorCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "commissionPercent" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageEvent_createdAt_idx" ON "public"."AiUsageEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_purpose_createdAt_idx" ON "public"."AiUsageEvent"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_name_createdAt_idx" ON "public"."ProductEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_userId_createdAt_idx" ON "public"."ProductEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PoolQuestion_contentHash_key" ON "public"."PoolQuestion"("contentHash");

-- CreateIndex
CREATE INDEX "PoolQuestion_topicKey_difficulty_status_idx" ON "public"."PoolQuestion"("topicKey", "difficulty", "status");

-- CreateIndex
CREATE INDEX "PoolQuestion_status_createdAt_idx" ON "public"."PoolQuestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PoolAnswer_poolQuestionId_idx" ON "public"."PoolAnswer"("poolQuestionId");

-- CreateIndex
CREATE INDEX "PoolAnswer_userId_createdAt_idx" ON "public"."PoolAnswer"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PoolSeen_userId_seenAt_idx" ON "public"."PoolSeen"("userId", "seenAt");

-- CreateIndex
CREATE INDEX "UserSession_userId_createdAt_idx" ON "public"."UserSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorCode_code_key" ON "public"."CreatorCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "public"."User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_reminderToken_key" ON "public"."User"("reminderToken");

-- CreateIndex
CREATE UNIQUE INDEX "SavedQuestion_userId_poolQuestionId_key" ON "public"."SavedQuestion"("userId", "poolQuestionId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_creatorCodeId_fkey" FOREIGN KEY ("creatorCodeId") REFERENCES "public"."CreatorCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoolAnswer" ADD CONSTRAINT "PoolAnswer_poolQuestionId_fkey" FOREIGN KEY ("poolQuestionId") REFERENCES "public"."PoolQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoolAnswer" ADD CONSTRAINT "PoolAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoolSeen" ADD CONSTRAINT "PoolSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoolSeen" ADD CONSTRAINT "PoolSeen_poolQuestionId_fkey" FOREIGN KEY ("poolQuestionId") REFERENCES "public"."PoolQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

