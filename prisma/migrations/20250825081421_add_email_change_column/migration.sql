-- AlterTable
ALTER TABLE "public"."EmailVerification" ADD COLUMN     "newEmail" TEXT;

-- CreateIndex
CREATE INDEX "EmailVerification_userId_newEmail_code_idx" ON "public"."EmailVerification"("userId", "newEmail", "code");
