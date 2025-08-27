-- AlterTable
ALTER TABLE "public"."AnswerOption" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "caseOrder" INTEGER,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_order_idx" ON "public"."AnswerOption"("questionId", "order");

-- CreateIndex
CREATE INDEX "Question_examId_order_idx" ON "public"."Question"("examId", "order");

-- CreateIndex
CREATE INDEX "UserQuestionStat_lastWrongAt_idx" ON "public"."UserQuestionStat"("lastWrongAt");
