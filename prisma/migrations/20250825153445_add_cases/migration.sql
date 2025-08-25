-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "caseId" TEXT;

-- CreateTable
CREATE TABLE "public"."QuestionCase" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vignette" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionCase_examId_order_idx" ON "public"."QuestionCase"("examId", "order");

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."QuestionCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionCase" ADD CONSTRAINT "QuestionCase_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
