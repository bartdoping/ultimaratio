import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prüfe Admin-Status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { questionIds } = body

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: "questionIds array is required" }, { status: 400 })
    }

    // Validiere, dass alle Fragen existieren
    const existingQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, stem: true }
    })

    if (existingQuestions.length !== questionIds.length) {
      return NextResponse.json({ error: "Some questions not found" }, { status: 404 })
    }

    // Lösche Fragen in einer Transaktion
    await prisma.$transaction(async (tx) => {
      // Lösche zuerst alle abhängigen Daten
      await tx.questionTag.deleteMany({
        where: { questionId: { in: questionIds } }
      })

      await tx.questionMedia.deleteMany({
        where: { questionId: { in: questionIds } }
      })

      await tx.answerOption.deleteMany({
        where: { questionId: { in: questionIds } }
      })

      await tx.attemptAnswer.deleteMany({
        where: { questionId: { in: questionIds } }
      })

      // Lösche schließlich die Fragen selbst
      await tx.question.deleteMany({
        where: { id: { in: questionIds } }
      })
    })

    return NextResponse.json({ 
      success: true, 
      deleted: questionIds.length,
      questions: existingQuestions.map(q => ({ id: q.id, stem: q.stem }))
    })

  } catch (error) {
    console.error("Delete questions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
