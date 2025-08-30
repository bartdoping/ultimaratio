// app/api/admin/exams/[id]/questions/reorder/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export const runtime = "nodejs"

const Body = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100), // Reihenfolge der *Seite*
  offset: z.number().int().min(0),                 // Startindex der Seite (z.B. (page-1)*100)
})

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { id: examId } = await ctx.params
    const parsed = Body.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 })
    const { ids, offset } = parsed.data

    // Sicherstellen, dass alle IDs zu diesem Exam gehören
    const rows = await prisma.question.findMany({
      where: { id: { in: ids }, examId },
      select: { id: true },
    })
    const found = new Set(rows.map(r => r.id))
    const unknown = ids.filter(id => !found.has(id))
    if (unknown.length) {
      return NextResponse.json({ error: "ids not in exam", unknown }, { status: 400 })
    }

    await prisma.$transaction(
      ids.map((id, i) =>
        prisma.question.update({
          where: { id },
          data: { order: offset + i },
        }),
      ),
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("admin reorder failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}