-- CreateTable
CREATE TABLE "public"."UserQuestionStat" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastWrongAt" TIMESTAMP(3),
    "lastCorrectAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestionStat_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateTable
CREATE TABLE "public"."QuestionStar" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionStar_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateIndex
CREATE INDEX "UserQuestionStat_questionId_idx" ON "public"."UserQuestionStat"("questionId");

-- CreateIndex
CREATE INDEX "QuestionStar_questionId_idx" ON "public"."QuestionStar"("questionId");

-- AddForeignKey
ALTER TABLE "public"."UserQuestionStat" ADD CONSTRAINT "UserQuestionStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserQuestionStat" ADD CONSTRAINT "UserQuestionStat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionStar" ADD CONSTRAINT "QuestionStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionStar" ADD CONSTRAINT "QuestionStar_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
