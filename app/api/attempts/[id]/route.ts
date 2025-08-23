// app/api/attempts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: me.id },
    include: {
      exam: { select: { id: true, title: true, passPercent: true, allowImmediateFeedback: true } },
      answers: true,
    },
  })
  if (!attempt) return NextResponse.json({ error: "not found" }, { status: 404 })

  return NextResponse.json({ ok: true, attempt })
}