// app/api/admin/storage-info/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    // Nur Admins dürfen das
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || 
        (session.user.email !== "info@ultima-rat.io" && session.user.email !== "admin@fragenkreuzen.de")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Zähle verschiedene Entitäten
    const [
      totalUsers,
      totalExams,
      totalQuestions,
      totalAttempts,
      totalPurchases,
      totalDecks
    ] = await Promise.all([
      prisma.user.count(),
      prisma.exam.count(),
      prisma.question.count(),
      prisma.attempt.count(),
      prisma.purchase.count(),
      prisma.deck.count()
    ])

    // Schätze Datenbank-Größe (vereinfacht)
    const estimatedSize = Math.round(
      (totalUsers * 0.5 + 
       totalExams * 0.1 + 
       totalQuestions * 0.2 + 
       totalAttempts * 0.3 + 
       totalPurchases * 0.1 + 
       totalDecks * 0.1) / 1024
    )

    return NextResponse.json({
      totalUsers,
      totalExams,
      totalQuestions,
      totalAttempts,
      totalPurchases,
      totalDecks,
      databaseSize: `${estimatedSize} MB`,
      lastCleanup: null // TODO: Implement cleanup tracking
    })

  } catch (error) {
    console.error("Storage info error:", error)
    return NextResponse.json({ 
      error: `Storage info failed: ${error instanceof Error ? error.message : "Unknown error"}` 
    }, { status: 500 })
  }
}
