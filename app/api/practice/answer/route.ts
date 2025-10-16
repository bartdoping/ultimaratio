// app/api/practice/answer/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"
import { incrementQuestionUsage } from "@/lib/subscription"

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
      select: { id: true, subscriptionStatus: true },
    })
    if (!me) {
      return NextResponse.json({ error: "user not found" }, { status: 401 })
    }
    const userId = me.id

    // Prüfe Tageslimit für Free-User
    const canUseQuestion = await incrementQuestionUsage(userId)
    if (!canUseQuestion) {
      return NextResponse.json({ 
        error: "Tageslimit erreicht", 
        message: "Du hast dein tägliches Limit von 20 Fragen erreicht. Upgrade zu Pro für unbegrenzten Zugang!",
        upgradeRequired: true
      }, { status: 403 })
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

    // Abo-Status prüfen (Pro-User haben Zugang zu allen Prüfungen)
    if (me.subscriptionStatus !== "pro") {
      return NextResponse.json({ 
        error: "subscription_required",
        message: "Pro-Abonnement erforderlich. Upgrade zu Pro für unbegrenzten Zugang zu allen Prüfungen!"
      }, { status: 403 })
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