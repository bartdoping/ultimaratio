// app/api/stars/[questionId]/toggle/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request, ctx: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    // Kompatibel mit Next 14/15: params kann ggf. ein Promise sein
    const params = "then" in (ctx?.params ?? {}) ? await ctx.params : ctx.params
    const questionId: string | undefined = params?.questionId
    if (!questionId) {
      return NextResponse.json({ ok: false, error: "missing questionId" }, { status: 400 })
    }

    const userId = session.user.id as string

    const existing = await prisma.questionStar.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })

    if (existing) {
      await prisma.questionStar.delete({
        where: { userId_questionId: { userId, questionId } },
      })
      return NextResponse.json({ ok: true, starred: false })
    }

    await prisma.questionStar.create({
      data: { userId, questionId },
    })
    return NextResponse.json({ ok: true, starred: true })
  } catch (e) {
    console.error("star toggle failed:", e)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}