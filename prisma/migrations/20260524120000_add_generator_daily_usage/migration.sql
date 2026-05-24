-- CreateTable
CREATE TABLE "GeneratorDailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonKey" TEXT,
    "ipHash" TEXT,
    "dayKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratorDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratorDailyUsage_userId_dayKey_key" ON "GeneratorDailyUsage"("userId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratorDailyUsage_anonKey_dayKey_key" ON "GeneratorDailyUsage"("anonKey", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratorDailyUsage_ipHash_dayKey_key" ON "GeneratorDailyUsage"("ipHash", "dayKey");

-- CreateIndex
CREATE INDEX "GeneratorDailyUsage_dayKey_idx" ON "GeneratorDailyUsage"("dayKey");

-- AddForeignKey
ALTER TABLE "GeneratorDailyUsage" ADD CONSTRAINT "GeneratorDailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
