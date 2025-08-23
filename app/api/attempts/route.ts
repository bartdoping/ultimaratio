// app/api/attempts/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as { examId?: string } | null
  const examId = body?.examId
  if (!examId) {
    return NextResponse.json({ ok: false, error: "missing examId" }, { status: 400 })
  }

  // Benutzer ermitteln
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 401 })
  }

  // Existiert die Prüfung?
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, isPublished: true },
  })
  if (!exam || !exam.isPublished) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 })
  }

  // Kauf checken
  const hasPurchase = await prisma.purchase.findUnique({
    where: { userId_examId: { userId: me.id, examId } },
    select: { id: true },
  })
  if (!hasPurchase) {
    return NextResponse.json({ ok: false, error: "not purchased" }, { status: 403 })
  }

  // Gibt es bereits einen offenen Versuch? -> reuse
  const existing = await prisma.attempt.findFirst({
    where: { userId: me.id, examId, finishedAt: null },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ ok: true, attemptId: existing.id, reused: true })
  }

  // Neu anlegen
  const attempt = await prisma.attempt.create({
    data: { userId: me.id, examId },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, attemptId: attempt.id })
}