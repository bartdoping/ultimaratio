-- AlterTable: User – Pro-Trial, Onboarding, Font-Scale
ALTER TABLE "User" ADD COLUMN "proTrialStartedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "proTrialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "examTarget" TEXT;
ALTER TABLE "User" ADD COLUMN "semester" INTEGER;
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "fontScale" TEXT NOT NULL DEFAULT 'normal';

-- CreateTable: UserStreak
CREATE TABLE "UserStreak" (
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDayKey" TEXT,
    "milestonesReached" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserStreak"
  ADD CONSTRAINT "UserStreak_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GeneratorPreset
CREATE TABLE "GeneratorPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "mode" TEXT NOT NULL DEFAULT 'single',
    "caseQuestionCount" INTEGER,
    "publicSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratorPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratorPreset_publicSlug_key" ON "GeneratorPreset"("publicSlug");
CREATE INDEX "GeneratorPreset_userId_idx" ON "GeneratorPreset"("userId");
CREATE INDEX "GeneratorPreset_publicSlug_idx" ON "GeneratorPreset"("publicSlug");

ALTER TABLE "GeneratorPreset"
  ADD CONSTRAINT "GeneratorPreset_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UserFeedback
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserFeedback_createdAt_idx" ON "UserFeedback"("createdAt");
CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");

ALTER TABLE "UserFeedback"
  ADD CONSTRAINT "UserFeedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
