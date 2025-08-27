import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()
  const tagsCsv = (searchParams.get("tags") ?? "").trim()
  const tagIds = tagsCsv ? tagsCsv.split(",").map(s => s.trim()).filter(Boolean) : []

  // Exams, die der User besitzt
  const owned = await prisma.purchase.findMany({
    where: { userId: me.id },
    select: { examId: true }
  })
  const ownedSet = new Set(owned.map(o => o.examId))
  if (ownedSet.size === 0) return NextResponse.json({ items: [] })

  const where: any = {
    examId: { in: Array.from(ownedSet) },
  }
  if (q) {
    where.OR = [
      { stem: { contains: q, mode: "insensitive" } },
      { explanation: { contains: q, mode: "insensitive" } },
      { tip: { contains: q, mode: "insensitive" } },
    ]
  }
  if (tagIds.length > 0) {
    // UND-Logik: jede Frage muss alle Tag-IDs haben
    where.AND = tagIds.map(tid => ({ tags: { some: { tagId: tid } } }))
  }

  const items = await prisma.question.findMany({
    where,
    take: 50,
    orderBy: { id: "asc" },
    select: {
      id: true, stem: true,
      exam: { select: { id: true, title: true } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true, parentId: true } } } },
    }
  })

  return NextResponse.json({ items })
}