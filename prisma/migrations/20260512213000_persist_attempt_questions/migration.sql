-- Persistiert die tatsächlich gestartete Fragenmenge eines Attempts.
-- Dadurch bleiben gefilterte/limitierte Prüfungen serverseitig bewertbar.
CREATE TABLE IF NOT EXISTS "public"."AttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttemptQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AttemptQuestion_attemptId_questionId_key"
ON "public"."AttemptQuestion"("attemptId", "questionId");

CREATE INDEX IF NOT EXISTS "AttemptQuestion_attemptId_order_idx"
ON "public"."AttemptQuestion"("attemptId", "order");

CREATE INDEX IF NOT EXISTS "AttemptQuestion_questionId_idx"
ON "public"."AttemptQuestion"("questionId");

ALTER TABLE "public"."AttemptQuestion"
ADD CONSTRAINT "AttemptQuestion_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "public"."Attempt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."AttemptQuestion"
ADD CONSTRAINT "AttemptQuestion_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
