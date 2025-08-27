// app/api/questions/[id]/star/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { body = {} }
  const star = !!body?.star

  if (star) {
    // upsert (userId, questionId)
    await prisma.questionStar.upsert({
      where: { userId_questionId: { userId: me.id, questionId } },
      update: {},
      create: { userId: me.id, questionId },
    })
  } else {
    await prisma.questionStar.deleteMany({
      where: { userId: me.id, questionId },
    })
  }

  return NextResponse.json({ ok: true })
}