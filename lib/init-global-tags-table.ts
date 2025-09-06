// lib/init-global-tags-table.ts
import prisma from "@/lib/db"

/**
 * Erstellt die ExamGlobalTag Tabelle falls sie nicht existiert.
 * Diese Funktion sollte beim Start der Anwendung aufgerufen werden.
 */
export async function initGlobalTagsTable() {
  try {
    // Prüfe ob die Tabelle existiert
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ExamGlobalTag" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "examId" TEXT NOT NULL,
        "tagId" TEXT NOT NULL,
        CONSTRAINT "ExamGlobalTag_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ExamGlobalTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `

    // Erstelle unique constraint falls nicht vorhanden
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "ExamGlobalTag_examId_tagId_key" ON "ExamGlobalTag"("examId", "tagId")
    `

    // Erstelle Indizes falls nicht vorhanden
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ExamGlobalTag_examId_idx" ON "ExamGlobalTag"("examId")
    `

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ExamGlobalTag_tagId_idx" ON "ExamGlobalTag"("tagId")
    `

    console.log("ExamGlobalTag table initialized successfully")
    return { success: true }
  } catch (error) {
    console.error("Error initializing ExamGlobalTag table:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
