// app/api/labs/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { ensureLaborH24InDb } from "@/lib/import-labor-h24"

// Laborwerte sind statische Referenzdaten — Antwort darf eine Stunde gecacht
// werden. `revalidate` greift dank der GET-Route über Next.js' Data Cache.
export const revalidate = 3600

type LabRow = {
  id: string
  name: string
  unit: string
  refRange: string
  category: string
}

// Zusätzlicher In-Memory-TTL-Cache als Schutz gegen wiederholte DB-Round-trips
// innerhalb derselben Server-Instance (z. B. zwei Dialog-Öffner kurz hintereinander).
const TTL_MS = 60 * 60 * 1000
let memoryCache: { data: LabRow[]; expiresAt: number } | null = null

export async function GET() {
  const now = Date.now()
  if (memoryCache && memoryCache.expiresAt > now) {
    return NextResponse.json({ labs: memoryCache.data })
  }

  await ensureLaborH24InDb()
  const labs = await prisma.labValue.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })

  // Prisma-Result auf das schmale Wire-Format mappen.
  const data: LabRow[] = labs.map((l) => ({
    id: l.id,
    name: l.name,
    unit: l.unit,
    refRange: l.refRange,
    category: l.category,
  }))

  memoryCache = { data, expiresAt: now + TTL_MS }
  return NextResponse.json({ labs: data })
}
