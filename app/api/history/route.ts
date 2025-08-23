// app/api/history/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })

  const attempts = await prisma.attempt.findMany({
    where: { userId: me.id },
    orderBy: { startedAt: "desc" },
    include: { exam: { select: { title: true, slug: true } } },
  })

  return NextResponse.json({
    ok: true,
    attempts: attempts.map(a => ({
      id: a.id,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
      scorePercent: a.scorePercent,
      passed: a.passed,
      exam: a.exam,
    })),
  })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })

  const res = await prisma.attempt.deleteMany({ where: { userId: me.id } })
  return NextResponse.json({ ok: true, count: res.count })
}