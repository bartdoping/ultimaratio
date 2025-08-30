/*
  Warnings:

  - You are about to drop the `_DeckToQuestion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,autoType]` on the table `Deck` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,title]` on the table `Deck` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."DeckAutoType" AS ENUM ('FLAGGED', 'WRONG');

-- DropForeignKey
ALTER TABLE "public"."_DeckToQuestion" DROP CONSTRAINT "_DeckToQuestion_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DeckToQuestion" DROP CONSTRAINT "_DeckToQuestion_B_fkey";

-- AlterTable
ALTER TABLE "public"."Deck" ADD COLUMN     "autoType" "public"."DeckAutoType",
ADD COLUMN     "isAuto" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "public"."_DeckToQuestion";

-- CreateTable
CREATE TABLE "public"."UserQuestionFlag" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuestionFlag_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateIndex
CREATE INDEX "UserQuestionFlag_questionId_idx" ON "public"."UserQuestionFlag"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Deck_userId_autoType_key" ON "public"."Deck"("userId", "autoType");

-- CreateIndex
CREATE UNIQUE INDEX "Deck_userId_title_key" ON "public"."Deck"("userId", "title");

-- AddForeignKey
ALTER TABLE "public"."UserQuestionFlag" ADD CONSTRAINT "UserQuestionFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserQuestionFlag" ADD CONSTRAINT "UserQuestionFlag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
