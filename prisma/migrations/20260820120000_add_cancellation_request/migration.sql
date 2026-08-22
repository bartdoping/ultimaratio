-- CreateTable: CancellationRequest (§ 312k BGB – Kündigungsprotokoll)
CREATE TABLE "CancellationRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "contractLabel" TEXT NOT NULL DEFAULT 'Pro-Abonnement fragenkreuzen.de',
    "kind" TEXT NOT NULL DEFAULT 'ordentlich',
    "reason" TEXT,
    "desiredDate" TEXT,
    "userId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "processedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CancellationRequest_email_idx" ON "CancellationRequest"("email");
CREATE INDEX "CancellationRequest_receivedAt_idx" ON "CancellationRequest"("receivedAt");
CREATE INDEX "CancellationRequest_status_idx" ON "CancellationRequest"("status");
