-- Altlast: Diese Indizes stehen im Schema, fehlten aber in Production.
-- Idempotent (Dev hat sie bereits). Tabellen sind klein → kein CONCURRENTLY nötig.

CREATE INDEX IF NOT EXISTS "Question_examId_caseId_idx" ON "Question"("examId", "caseId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
