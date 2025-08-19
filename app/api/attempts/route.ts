import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export const runtime = "nodejs"

// POST /api/attempts  { examId: string }  ->  { attemptId }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as { examId?: string }
  const examId = body?.examId
  if (!examId) {
    return NextResponse.json({ error: "missing-examId" }, { status: 400 })
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, isPublished: true },
  })
  if (!exam || !exam.isPublished) {
    return NextResponse.json({ error: "exam-not-found" }, { status: 404 })
  }

  const userId = (session.user as any).id as string
  const role = (session.user as any).role as "user" | "admin"

  if (role !== "admin") {
    const hasPurchase = await prisma.purchase.findUnique({
      where: { userId_examId: { userId, examId } },
      select: { id: true },
    })
    if (!hasPurchase) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
  }

  const attempt = await prisma.attempt.create({
    data: { userId, examId },
    select: { id: true },
  })

  return NextResponse.json({ attemptId: attempt.id })
}

// GET /api/attempts -> letzte 20 Versuche
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: {
      id: true,
      examId: true,
      startedAt: true,
      finishedAt: true,
      scorePercent: true,
      passed: true,
      exam: { select: { title: true, slug: true } },
    },
  })

  return NextResponse.json({ attempts })
}
