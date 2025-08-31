import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"

const Body = z.object({
  questionId: z.string().min(1),
  answerOptionId: z.string().min(1),
})

function scheduleNext(
  wasCorrect: boolean,
  cur: { interval: number; ease: number; lapses: number }
) {
  let { interval, ease, lapses } = cur
  if (wasCorrect) {
    // simple SM-2 like
    ease = Math.max(1.3, ease + 0.15)
    interval = Math.max(1, Math.round(interval * ease))
  } else {
    lapses += 1
    ease = Math.max(1.3, ease * 0.5)
    interval = 1
  }
  const dueAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000)
  return { interval, ease, lapses, dueAt }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = Body.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 })

    const { questionId, answerOptionId } = parsed.data

    // Check correctness serverseitig
    const opt = await prisma.answerOption.findUnique({
      where: { id: answerOptionId },
      select: { isCorrect: true, questionId: true },
    })
    if (!opt || opt.questionId !== questionId) {
      return NextResponse.json({ error: "answer mismatch" }, { status: 400 })
    }
    const wasCorrect = !!opt.isCorrect

    // ReviewItem holen/erstellen
    let ri = await prisma.reviewItem.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { interval: true, ease: true, lapses: true },
    })

    if (!ri) {
      ri = { interval: 1, ease: 2.5, lapses: 0 }
      await prisma.reviewItem.create({
        data: { userId, questionId, dueAt: new Date(), interval: ri.interval, ease: ri.ease, lapses: ri.lapses, suspended: false },
      })
    }

    const next = scheduleNext(wasCorrect, ri)
    await prisma.reviewItem.update({
      where: { userId_questionId: { userId, questionId } },
      data: { interval: next.interval, ease: next.ease, lapses: next.lapses, dueAt: next.dueAt },
    })

    return NextResponse.json({ ok: true, wasCorrect })
  } catch (e) {
    console.error("sr answer failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}