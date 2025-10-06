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
    // Datenbankgröße
    const dbSize = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size,
             pg_database_size(current_database()) as size_bytes
    ` as any[]

    // Tabellen-Statistiken
    const tableStats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    ` as any[]

    // User-Anzahl
    const userCount = await prisma.user.count()
    const questionCount = await prisma.question.count()
    const attemptCount = await prisma.attempt.count()

    return NextResponse.json({
      database: {
        size: dbSize[0]?.database_size || "Unknown",
        sizeBytes: dbSize[0]?.size_bytes || 0,
        sizeMB: Math.round((dbSize[0]?.size_bytes || 0) / 1024 / 1024 * 100) / 100
      },
      tables: tableStats,
      counts: {
        users: userCount,
        questions: questionCount,
        attempts: attemptCount
      },
      limits: {
        freeTier: "3 GB",
        currentUsage: `${Math.round((dbSize[0]?.size_bytes || 0) / 1024 / 1024 * 100) / 100} MB`,
        percentage: Math.round(((dbSize[0]?.size_bytes || 0) / 1024 / 1024 / 1024) / 3 * 100 * 100) / 100
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
