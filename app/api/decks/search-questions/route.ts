// app/api/decks/search-questions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"

export const runtime = "nodejs"

type Body = {
  q?: string | null
  tags?: string[] // AND-Filter über Tag-Slugs
}

function norm(s: unknown) {
  return typeof s === "string" ? s : ""
}

function makeExcerpt(haystack: string, needle: string, ctx = 35) {
  const hs = haystack ?? ""
  const nd = needle ?? ""
  const idx = hs.toLowerCase().indexOf(nd.toLowerCase())
  if (idx < 0) return null
  const start = Math.max(0, idx - ctx)
  const end = Math.min(haystack.length, idx + nd.length + ctx)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < haystack.length ? "…" : ""
  return prefix + haystack.slice(start, end) + suffix
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const q = (body.q ?? "").trim()
  const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean) : []

  // Ohne Suchbegriff und ohne Tag-Filter: keine heavy query ausführen
  if (!q && tags.length === 0) {
    return NextResponse.json({ items: [] })
  }

  // WHERE dynamisch & typsicher aufbauen
  const where: Prisma.QuestionWhereInput = {
    // nur erworbene Exams
    exam: { purchases: { some: { userId: me.id } } },
  }

  const andClauses: Prisma.QuestionWhereInput[] = []

  // AND-Filter pro Tag (Slug)
  for (const slug of tags) {
    andClauses.push({ tags: { some: { tag: { slug } } } })
  }

  // Volltext-OR über Frage, Fall (Titel/Vignette) & Antwortoptionen
  if (q.length > 0) {
    andClauses.push({
      OR: [
        { stem: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { options: { some: { text: { contains: q, mode: Prisma.QueryMode.insensitive } } } },
        {
          case: {
            OR: [
              { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { vignette: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          },
        },
      ],
    })
  }

  if (andClauses.length > 0) {
    where.AND = andClauses
  }

  const questions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      stem: true,
      exam: { select: { title: true } },
      case: {
        select: {
          id: true,
          title: true,
          vignette: true,
          _count: { select: { questions: true } },
        },
      },
      options: { select: { id: true, text: true } },
      tags: { select: { tag: { select: { slug: true, name: true } } } },
    },
    orderBy: { id: "asc" },
    take: 200, // einfache Obergrenze
  })

  // Der TS kennt jetzt nur die ausgewählten Felder:
  type QRow = {
    id: string
    stem: string
    exam: { title: string }
    case: { id: string; title: string | null; vignette: string | null; _count: { questions: number } } | null
    options: { id: string; text: string }[]
    tags: { tag: { slug: string; name: string } }[]
  }

  // Nachbearbeitung: markieren, WO der Treffer ist + kurze Excerpts
  const items = (questions as QRow[]).map((qq) => {
    const matches: ("stem" | "case_title" | "case_vignette" | "option")[] = []
    const excerpts: Record<string, string | null> = {}

    if (q) {
      if (norm(qq.stem).toLowerCase().includes(q.toLowerCase())) {
        matches.push("stem")
        excerpts["stem"] = makeExcerpt(qq.stem, q)
      }
      if (qq.case?.title && qq.case.title.toLowerCase().includes(q.toLowerCase())) {
        matches.push("case_title")
        excerpts["case_title"] = makeExcerpt(qq.case.title, q)
      }
      if (qq.case?.vignette && qq.case.vignette.toLowerCase().includes(q.toLowerCase())) {
        matches.push("case_vignette")
        excerpts["case_vignette"] = makeExcerpt(qq.case.vignette, q)
      }
      const hitOpt = qq.options.find((o) => norm(o.text).toLowerCase().includes(q.toLowerCase()))
      if (hitOpt) {
        matches.push("option")
        excerpts["option"] = makeExcerpt(hitOpt.text, q)
      }
    }

    return {
      id: qq.id,
      stem: qq.stem,
      examTitle: qq.exam.title,
      caseId: qq.case?.id ?? null,
      caseTitle: qq.case?.title ?? null,
      caseQuestionCount: qq.case?._count.questions ?? 0,
      tags: qq.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })),
      matchIn: matches,
      excerpts,
    }
  })

  return NextResponse.json({ items })
}