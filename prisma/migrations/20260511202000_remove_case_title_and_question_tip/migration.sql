-- Entfernt nicht mehr verwendete Prüfungsfelder.
ALTER TABLE "public"."Question" DROP COLUMN IF EXISTS "tip";
ALTER TABLE "public"."QuestionCase" DROP COLUMN IF EXISTS "title";
