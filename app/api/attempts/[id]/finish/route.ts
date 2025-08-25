import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await ctx.params
    const attemptId = id
    if (!attemptId) {
      return NextResponse.json({ ok: false, error: "Missing attempt id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const Parsed = z.object({ elapsedSec: z.number().int().nonnegative().optional() }).safeParse(body)
    const elapsedFromClient = Parsed.success ? Parsed.data.elapsedSec : undefined

    // Attempt inkl. Ownership
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, examId: true, elapsedSec: true },
    })
    if (!attempt || attempt.userId !== (session.user as any).id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    }

    // Exam: Bestehensgrenze + Anzahl Fragen
    const exam = await prisma.exam.findUnique({
      where: { id: attempt.examId },
      select: { passPercent: true, _count: { select: { questions: true } } },
    })
    if (!exam) {
      return NextResponse.json({ ok: false, error: "Exam not found" }, { status: 404 })
    }

    // Score berechnen
    const correctCount = await prisma.attemptAnswer.count({
      where: { attemptId, isCorrect: true },
    })
    const totalQuestions = exam._count.questions || 0
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const passed = scorePercent >= exam.passPercent

    // NEW: finale Dauer = max(DB.elapsedSec, client.elapsedSec); KEIN startedAt-Derivat mehr
    const finalElapsed = Math.max(
      attempt.elapsedSec ?? 0,
      typeof elapsedFromClient === "number" ? elapsedFromClient : 0
    )

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        finishedAt: new Date(),
        scorePercent,
        passed,
        elapsedSec: finalElapsed,
      },
    })

    return NextResponse.json({ ok: true, scorePercent, passed, elapsedSec: finalElapsed })
  } catch (e) {
    console.error("finish attempt failed:", e)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}