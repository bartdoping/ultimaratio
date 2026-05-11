-- Entfernt technische Fall-Reihenfolge aus Fragen und Fällen.
DROP INDEX IF EXISTS "public"."QuestionCase_examId_order_idx";
ALTER TABLE "public"."Question" DROP COLUMN IF EXISTS "caseOrder";
ALTER TABLE "public"."QuestionCase" DROP COLUMN IF EXISTS "order";
CREATE INDEX IF NOT EXISTS "QuestionCase_examId_idx" ON "public"."QuestionCase"("examId");
