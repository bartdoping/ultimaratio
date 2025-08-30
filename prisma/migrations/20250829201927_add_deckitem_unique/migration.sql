-- CreateTable
CREATE TABLE "public"."_DeckToQuestion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DeckToQuestion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DeckToQuestion_B_index" ON "public"."_DeckToQuestion"("B");

-- AddForeignKey
ALTER TABLE "public"."_DeckToQuestion" ADD CONSTRAINT "_DeckToQuestion_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DeckToQuestion" ADD CONSTRAINT "_DeckToQuestion_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
