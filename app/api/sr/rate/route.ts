// app/api/sr/rate/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + Math.max(1, Math.round(days)))
  return x
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const questionId = String(body?.questionId || "")
  const rating = String(body?.rating || "good") as "again" | "good" | "easy"
  if (!questionId) return NextResponse.json({ error: "missing questionId" }, { status: 400 })

  const now = new Date()

  const ui = await prisma.sRUserSetting.findUnique({ where: { userId } })
  const easeMin = ui?.easeMin ?? 1.3
  const easeMax = ui?.easeMax ?? 2.7
  const startEase = ui?.startEase ?? 2.5

  await prisma.$transaction(async (tx) => {
    const cur = await tx.reviewItem.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {},
      create: { userId, questionId, dueAt: now, interval: 1, ease: startEase, lapses: 0, suspended: false },
    })

    let ease = cur.ease
    let interval = cur.interval
    let lapses = cur.lapses

    if (rating === "again") {
      ease = Math.max(easeMin, ease - 0.2)
      interval = 1
      lapses += 1
    } else if (rating === "good") {
      interval = Math.max(1, Math.round(interval * ease))
    } else { // easy
      ease = Math.min(easeMax, ease + 0.15)
      interval = Math.max(2, Math.round(interval * ease + 1))
    }

    await tx.reviewItem.update({
      where: { userId_questionId: { userId, questionId } },
      data: { ease, interval, lapses, dueAt: addDays(now, interval) },
    })
  })

  return NextResponse.json({ ok: true })
}