import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const { id: attemptId } = await params

    // Finde den Benutzer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 })
    }

    // Prüfe, ob der Prüfungsdurchlauf dem Benutzer gehört
    const attempt = await prisma.attempt.findFirst({
      where: {
        id: attemptId,
        userId: user.id
      },
      select: { id: true, finishedAt: true }
    })

    if (!attempt) {
      return NextResponse.json({ error: "Prüfungsdurchlauf nicht gefunden" }, { status: 404 })
    }

    // Lösche den Prüfungsdurchlauf und alle zugehörigen Daten
    await prisma.$transaction(async (tx) => {
      // Lösche alle Antworten
      await tx.attemptAnswer.deleteMany({
        where: { attemptId }
      })

      // Lösche den Prüfungsdurchlauf
      await tx.attempt.delete({
        where: { id: attemptId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Fehler beim Löschen des Prüfungsdurchlaufs:", error)
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    )
  }
}
