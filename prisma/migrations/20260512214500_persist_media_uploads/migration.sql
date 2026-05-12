-- Persistiert Admin-Bilduploads in der Datenbank statt in einem flüchtigen Prozess-Cache.
ALTER TABLE "public"."MediaAsset"
ADD COLUMN IF NOT EXISTS "dataBase64" TEXT,
ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
