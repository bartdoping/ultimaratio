// app/api/history/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

type Params = { params: { id: string } }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })

  const attempt = await prisma.attempt.findUnique({ where: { id: params.id }, select: { userId: true } })
  if (!attempt || attempt.userId !== me.id) return NextResponse.json({ ok: false }, { status: 404 })

  await prisma.attempt.delete({ where: { id: params.id } }) // AttemptAnswer wird via onDelete Cascade mit gelöscht
  return NextResponse.json({ ok: true })
}
