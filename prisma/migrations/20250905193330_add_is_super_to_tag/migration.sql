-- AlterTable
ALTER TABLE "public"."Tag" ADD COLUMN     "isSuper" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Tag_isSuper_idx" ON "public"."Tag"("isSuper");
