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

    const parsed = z.object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(200),
    }).safeParse({ page, pageSize })

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid pagination" }, { status: 400 })
    }

    const skip = (page - 1) * pageSize
    const take = pageSize

    const [total, items] = await Promise.all([
      prisma.question.count({ where: { examId } }),
      prisma.question.findMany({
        where: { examId },
        // FIX: Question hat kein createdAt -> nach 'order' dann 'id' sortieren
        orderBy: [{ order: "asc" }, { id: "asc" }],
        skip,
        take,
        select: {
          id: true,
          stem: true,
          caseId: true,
          order: true,
        },
      }),
    ])

    return NextResponse.json({
      page,
      pageSize,
      total,
      items: items.map((q) => ({
        id: q.id,
        // kurzer Hover-Text: erstes Stück aus dem Stem
        preview: q.stem.slice(0, 120),
        isCase: !!q.caseId,
        order: q.order ?? 0,
      })),
    })
  } catch (e) {
    console.error("admin list questions failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}