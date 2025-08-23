// app/api/history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })

  const a = await prisma.attempt.findUnique({ where: { id }, select: { userId: true } })
  if (!a || a.userId !== me.id) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })

  await prisma.attempt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}