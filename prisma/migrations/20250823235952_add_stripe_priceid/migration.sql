/*
  Warnings:

  - You are about to alter the column `stripePriceId` on the `Exam` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "public"."Exam" ALTER COLUMN "stripePriceId" SET DATA TYPE VARCHAR(255);
