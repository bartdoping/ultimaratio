-- CreateTable
CREATE TABLE "public"."SRUserSetting" (
    "userId" TEXT NOT NULL,
    "newPerDay" INTEGER NOT NULL DEFAULT 20,
    "reviewsPerDay" INTEGER NOT NULL DEFAULT 200,
    "startEase" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "easeMin" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "easeMax" DOUBLE PRECISION NOT NULL DEFAULT 2.7,
    "learningSteps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SRUserSetting_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."SRDeckSetting" (
    "deckId" TEXT NOT NULL,
    "srEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newPerDay" INTEGER,
    "reviewsPerDay" INTEGER,
    "startEase" DOUBLE PRECISION,
    "learningSteps" JSONB,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SRDeckSetting_pkey" PRIMARY KEY ("deckId")
);

-- AddForeignKey
ALTER TABLE "public"."SRUserSetting" ADD CONSTRAINT "SRUserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SRDeckSetting" ADD CONSTRAINT "SRDeckSetting_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "public"."Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
