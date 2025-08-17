// app/api/attempts/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"

const BodySchema = z.object({
  slug: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 })
  const { slug } = parsed.data

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 401 })

  const exam = await prisma.exam.findUnique({ where: { slug } })
  if (!exam || !exam.isPublished) return NextResponse.json({ ok: false, error: "Exam not found" }, { status: 404 })

  // Zugriff: Admin hat immer Zugriff, sonst Kauf prüfen
  const isAdmin = (session.user as any).role === "admin"
  if (!isAdmin) {
    const hasPurchase = await prisma.purchase.findFirst({ where: { userId: user.id, examId: exam.id } })
    if (!hasPurchase) return NextResponse.json({ ok: false, error: "No access" }, { status: 403 })
  }

  const attempt = await prisma.attempt.create({
    data: { userId: user.id, examId: exam.id },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, attemptId: attempt.id })
}
