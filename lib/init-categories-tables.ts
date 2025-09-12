import { prisma } from "@/lib/db"

export async function initCategoriesTables() {
  try {
    // Erstelle Category-Tabelle
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
      )
    `

    // Erstelle unique constraint für name (nur wenn nicht existiert)
    try {
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name")
      `
    } catch (error: any) {
      // Ignoriere Fehler wenn Index bereits existiert
      if (!error.message?.includes("already exists")) {
        throw error
      }
    }

    // Füge categoryId Spalte zu Exam hinzu
    await prisma.$executeRaw`
      ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "categoryId" TEXT
    `

    // Erstelle foreign key constraint (nur wenn nicht existiert)
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Exam" ADD CONSTRAINT "Exam_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
      `
    } catch (error: any) {
      // Ignoriere Fehler wenn Constraint bereits existiert
      if (!error.message?.includes("already exists")) {
        throw error
      }
    }

    console.log("Categories tables initialized successfully")
  } catch (error) {
    console.error("Error initializing categories tables:", error)
  }
}
