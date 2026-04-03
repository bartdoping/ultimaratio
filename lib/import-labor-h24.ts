import fs from "fs"
import path from "path"
import prisma from "@/lib/db"

export type LaborH24Row = {
  name: string
  refRange: string
  unit: string
  category: string
}

function jsonPath() {
  return path.join(process.cwd(), "data", "laborwerte-h24.json")
}

/** Liest die IMPP-H24-Referenztabellen aus dem Repo. */
export function readLaborH24Json(): LaborH24Row[] {
  const p = jsonPath()
  if (!fs.existsSync(p)) return []
  const raw = fs.readFileSync(p, "utf8")
  const data = JSON.parse(raw) as LaborH24Row[]
  return Array.isArray(data) ? data : []
}

/**
 * Wenn die Tabelle leer ist: alle Zeilen aus `data/laborwerte-h24.json` einfügen.
 * (Kein Löschen bestehender Einträge.)
 */
export async function ensureLaborH24InDb(): Promise<number> {
  const n = await prisma.labValue.count()
  if (n > 0) return 0
  const labs = readLaborH24Json()
  if (labs.length === 0) return 0
  await prisma.labValue.createMany({ data: labs })
  return labs.length
}

/**
 * Ersetzt alle Laborwerte durch den Inhalt der JSON-Datei (Admin).
 */
export async function replaceAllLaborH24FromJson(): Promise<number> {
  const labs = readLaborH24Json()
  if (labs.length === 0) throw new Error("Keine Daten in data/laborwerte-h24.json")
  await prisma.$transaction(async (tx) => {
    await tx.labValue.deleteMany({})
    await tx.labValue.createMany({ data: labs })
  })
  return labs.length
}
