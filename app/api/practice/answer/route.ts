// app/api/practice/answer/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"
import { isUserPro } from "@/lib/subscription"

export const runtime = "nodejs"

const BodySchema = z.object({
  questionId: z.string().min(1),
  answerOptionId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    // Auth
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) {
      return NextResponse.json({ error: "user not found" }, { status: 401 })
    }
    const userId = me.id

    const proOk = await isUserPro(userId)
    if (!proOk) {
      return NextResponse.json(
        {
          error: "subscription_required",
          message:
            "Pro-Abonnement erforderlich. Upgrade zu Pro für unbegrenzten Zugang zu allen Prüfungen!",
          upgradeRequired: true,
        },
        { status: 403 }
      )
    }

    // Body validieren
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 })
    }
    const { questionId, answerOptionId } = parsed.data

    // Frage prüfen
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, examId: true },
    })
    if (!question) {
      return NextResponse.json({ error: "question not found" }, { status: 404 })
    }

    // Option prüfen (muss zur Frage gehören)
    const option = await prisma.answerOption.findFirst({
      where: { id: answerOptionId, questionId },
      select: { isCorrect: true },
    })
    if (!option) {
      return NextResponse.json({ error: "bad option" }, { status: 400 })
    }

    // Lernstatistik aktualisieren (upsert)
    const now = new Date()
    await prisma.userQuestionStat.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: option.isCorrect
        ? { seenCount: { increment: 1 }, lastCorrectAt: now }
        : { seenCount: { increment: 1 }, wrongCount: { increment: 1 }, lastWrongAt: now },
      create: {
        userId,
        questionId,
        seenCount: 1,
        wrongCount: option.isCorrect ? 0 : 1,
        lastCorrectAt: option.isCorrect ? now : null,
        lastWrongAt: option.isCorrect ? null : now,
      },
    })

    return NextResponse.json({ ok: true, isCorrect: option.isCorrect })
  } catch (e) {
    console.error("practice answer failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}