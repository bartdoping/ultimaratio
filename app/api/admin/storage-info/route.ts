// app/api/admin/storage-info/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireAdminJson } from "@/lib/authz"

export const runtime = "nodejs"

export async function GET() {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    // Zähle verschiedene Entitäten
    const [
      totalUsers,
      totalExams,
      totalQuestions,
      totalAttempts,
      totalPurchases,
      totalDecks,
      totalAttemptAnswers,
      totalTags,
      totalSubscriptions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.exam.count(),
      prisma.question.count(),
      prisma.attempt.count(),
      prisma.purchase.count(),
      prisma.deck.count(),
      prisma.attemptAnswer.count(),
      prisma.tag.count(),
      prisma.subscription.count()
    ])

    // Schätze Datenbank-Größe (realistischer)
    const estimatedSize = Math.max(1, Math.round(
      (totalUsers * 2 +           // User-Daten: ~2KB pro User
       totalExams * 0.5 +         // Exam-Daten: ~0.5KB pro Exam
       totalQuestions * 1 +       // Question-Daten: ~1KB pro Question
       totalAttempts * 0.8 +      // Attempt-Daten: ~0.8KB pro Attempt
       totalPurchases * 0.2 +     // Purchase-Daten: ~0.2KB pro Purchase
       totalDecks * 0.3 +         // Deck-Daten: ~0.3KB pro Deck
       totalAttemptAnswers * 0.1 + // AttemptAnswer-Daten: ~0.1KB pro Answer
       totalTags * 0.05 +         // Tag-Daten: ~0.05KB pro Tag
       totalSubscriptions * 0.3   // Subscription-Daten: ~0.3KB pro Subscription
      ) / 1024
    ))

    return NextResponse.json({
      totalUsers,
      totalExams,
      totalQuestions,
      totalAttempts,
      totalPurchases,
      totalDecks,
      totalAttemptAnswers,
      totalTags,
      totalSubscriptions,
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
