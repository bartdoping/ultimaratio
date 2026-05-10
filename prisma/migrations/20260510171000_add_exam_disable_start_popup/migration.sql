-- Add flag to disable start configuration popup per exam
ALTER TABLE "Exam"
ADD COLUMN IF NOT EXISTS "disableStartPopup" BOOLEAN NOT NULL DEFAULT false;

