// app/api/decks/search-questions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }) }
  const q = typeof body?.q === "string" ? body.q.trim() : ""
  const tags: string[] = Array.isArray(body?.tags) ? body.tags.filter(Boolean) : []

  // WHERE: gekaufte Exams
  const AND: any[] = [{ exam: { purchases: { some: { userId: me.id } } } }]

  if (q) {
    AND.push({ stem: { contains: q, mode: "insensitive" } })
  }

  // AND-Logik: jede ausgewählte Tag-Slug muss vorkommen
  for (const slug of tags) {
    AND.push({
      tags: { some: { tag: { slug } } },
    })
  }

  const found = await prisma.question.findMany({
    where: { AND },
    orderBy: { id: "asc" },
    take: 50,
    select: {
      id: true,
      stem: true,
      exam: { select: { title: true } },
      case: { select: { title: true } },
      tags: { select: { tag: { select: { slug: true, name: true } } } },
    },
  })

  const items = found.map(q => ({
    id: q.id,
    stem: q.stem,
    examTitle: q.exam.title,
    caseTitle: q.case?.title ?? null,
    tags: q.tags.map(t => ({ slug: t.tag.slug, name: t.tag.name })),
  }))

  return NextResponse.json({ items })
}