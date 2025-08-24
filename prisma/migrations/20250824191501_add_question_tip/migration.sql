/*
  Warnings:

  - A unique constraint covering the columns `[stripeProductId]` on the table `Exam` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePriceId]` on the table `Exam` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Exam" ADD COLUMN     "stripeProductId" TEXT,
ALTER COLUMN "stripePriceId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "tip" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Exam_stripeProductId_key" ON "public"."Exam"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_stripePriceId_key" ON "public"."Exam"("stripePriceId");
