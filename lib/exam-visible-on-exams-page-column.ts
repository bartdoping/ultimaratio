import prisma from "@/lib/db"

/**
 * True, wenn die Migration für `Exam.visibleOnExamsPage` auf der DB angewendet wurde.
 * Ohne diese Spalte würden Prisma-Abfragen mit dem Feld fehlschlagen (z. B. vor `migrate deploy`).
 */
export async function examVisibleOnExamsPageColumnExists(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_attribute a
        INNER JOIN pg_class c ON c.oid = a.attrelid
        INNER JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'Exam'
          AND a.attname = 'visibleOnExamsPage'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ) AS exists
    `
    return !!rows?.[0]?.exists
  } catch {
    return false
  }
}
