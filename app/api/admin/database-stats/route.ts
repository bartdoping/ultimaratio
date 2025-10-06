import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

// GET: Datenbank-Statistiken
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  try {
    // Vereinfachte Abfragen ohne komplexe SQL
    const userCount = await prisma.user.count()
    const questionCount = await prisma.question.count()
    const attemptCount = await prisma.attempt.count()
    
    // Einfache Datenbankgröße-Abfrage
    let dbSize = "Unknown"
    let sizeBytes = 0
    
    try {
      const dbSizeResult = await prisma.$queryRaw`
        SELECT pg_database_size(current_database()) as size_bytes
      ` as any[]
      
      if (dbSizeResult && dbSizeResult[0]) {
        sizeBytes = Number(dbSizeResult[0].size_bytes) || 0
        dbSize = `${Math.round(sizeBytes / 1024 / 1024 * 100) / 100} MB`
      }
    } catch (dbError) {
      console.error("Database size query failed:", dbError)
    }

    return NextResponse.json({
      database: {
        size: dbSize,
        sizeBytes: sizeBytes,
        sizeMB: Math.round(sizeBytes / 1024 / 1024 * 100) / 100
      },
      tables: [], // Vereinfacht - keine Tabellen-Details
      counts: {
        users: userCount,
        questions: questionCount,
        attempts: attemptCount
      },
      limits: {
        freeTier: "3 GB",
        currentUsage: `${Math.round(sizeBytes / 1024 / 1024 * 100) / 100} MB`,
        percentage: Math.round((sizeBytes / 1024 / 1024 / 1024) / 3 * 100 * 100) / 100
      }
    })
  } catch (error) {
    console.error("Error fetching database stats:", error)
    return NextResponse.json({ 
      ok: false, 
      error: "server_error",
      message: "Fehler beim Abrufen der Datenbank-Statistiken"
    }, { status: 500 })
  }
}
