// app/api/admin/exams/[id]/questions/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: Ctx) {
  try {
    await requireAdmin()

    const { id: examId } = await ctx.params

    const url = new URL(req.url)
    const page = Number(url.searchParams.get("page") || 1)
    const pageSize = Number(url.searchParams.get("pageSize") || 100)
    const health = url.searchParams.get("health") || ""
    const validHealth = [
      "missing-explanation",
      "option-problem",
      "missing-option-explanation",
      "missing-tags",
      "case-text-problem",
    ].includes(health) ? health : null

    const parsed = z.object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(200),
    }).safeParse({ page, pageSize })

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid pagination" }, { status: 400 })
    }

    const skip = (page - 1) * pageSize
    const take = pageSize
    const questionSelect = {
      id: true,
      stem: true,
      explanation: true,
      caseId: true,
      case: { select: { vignette: true } },
      order: true,
      options: { select: { text: true, isCorrect: true, explanation: true } },
      tags: {
        select: {
          tag: {
            select: {
              parentId: true
            }
          }
        }
      }
    } as const

    const toItem = (q: any) => {
      const hasTags = q.tags.some((t: any) => t.tag.parentId !== null)
      const correctCount = q.options.filter((o: any) => o.isCorrect).length
      const hasOptionProblem = q.options.length < 2 || correctCount !== 1 || q.options.some((o: any) => !o.text.trim())
      const healthProblems = [
        !q.explanation?.trim() ? "missing-explanation" : null,
        hasOptionProblem ? "option-problem" : null,
        q.options.some((o: any) => !o.explanation?.trim()) ? "missing-option-explanation" : null,
        !hasTags ? "missing-tags" : null,
        q.caseId && !q.case?.vignette?.trim() ? "case-text-problem" : null,
      ].filter((problem): problem is string => Boolean(problem))

      return {
        id: q.id,
        // kurzer Hover-Text: erstes Stück aus dem Stem
        preview: q.stem.slice(0, 120),
        isCase: !!q.caseId,
        order: q.order ?? 0,
        // Prüfe ob Frage normale Tags hat (nicht Supertags)
        hasTags,
        healthProblems,
      }
    }

    if (validHealth) {
      const allItems = (await prisma.question.findMany({
        where: { examId },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: questionSelect,
      }))
        .map(toItem)
        .filter((item) => item.healthProblems.includes(validHealth))

      return NextResponse.json({
        page,
        pageSize,
        total: allItems.length,
        items: allItems.slice(skip, skip + take),
      })
    }

    const [total, items] = await Promise.all([
      prisma.question.count({ where: { examId } }),
      prisma.question.findMany({
        where: { examId },
        // FIX: Question hat kein createdAt -> nach 'order' dann 'id' sortieren
        orderBy: [{ order: "asc" }, { id: "asc" }],
        skip,
        take,
        select: questionSelect,
      }),
    ])

    return NextResponse.json({
      page,
      pageSize,
      total,
      items: items.map(toItem),
    })
  } catch (e) {
    console.error("admin list questions failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}