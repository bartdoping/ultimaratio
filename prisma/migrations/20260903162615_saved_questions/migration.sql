-- CreateTable
CREATE TABLE "public"."SavedQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "orderInGroup" INTEGER NOT NULL DEFAULT 0,
    "topic" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'single',
    "section" TEXT NOT NULL DEFAULT 'auto',
    "sourceLabel" TEXT,
    "stem" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastAnsweredAt" TIMESTAMP(3),
    "lastCorrect" BOOLEAN,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedQuestion_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "SavedQuestion_userId_createdAt_idx" ON "public"."SavedQuestion"("userId", "createdAt");
-- CreateIndex
CREATE INDEX "SavedQuestion_userId_dueAt_idx" ON "public"."SavedQuestion"("userId", "dueAt");
-- CreateIndex
CREATE INDEX "SavedQuestion_userId_lastCorrect_idx" ON "public"."SavedQuestion"("userId", "lastCorrect");
-- CreateIndex
CREATE INDEX "SavedQuestion_userId_topic_idx" ON "public"."SavedQuestion"("userId", "topic");
-- CreateIndex
CREATE INDEX "SavedQuestion_groupId_idx" ON "public"."SavedQuestion"("groupId");
-- AddForeignKey
ALTER TABLE "public"."SavedQuestion" ADD CONSTRAINT "SavedQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
