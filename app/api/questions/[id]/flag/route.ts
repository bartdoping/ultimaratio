// app/api/questions/[id]/flag/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// In Next.js 15 kann `params` ein Promise sein:
type Ctx = { params: Promise<{ id: string }> | { id: string } }

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    // params sicher auslesen (Promise ODER sync)
    const { id } =
      "then" in (ctx.params as any)
        ? await (ctx.params as Promise<{ id: string }>)
        : (ctx.params as { id: string })

    const questionId = id
    if (!questionId) {
      return NextResponse.json({ error: "missing question id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({} as any))
    const flagged = !!body?.flagged

    // Frage existiert?
    const q = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    })
    if (!q) return NextResponse.json({ error: "question not found" }, { status: 404 })

    // Persistenz (mit „Tabelle fehlt“-Fallback)
    if (flagged) {
      try {
        await prisma.userQuestionFlag.upsert({
          where: { userId_questionId: { userId, questionId } },
          update: { flaggedAt: new Date() },
          create: { userId, questionId },
        })
      } catch (e: any) {
        // P2021: Tabelle existiert (noch) nicht -> Soft-Erfolg zurückgeben
        if (e?.code === "P2021") {
          return NextResponse.json({ ok: true, flagged, persisted: false })
        }
        throw e
      }
    } else {
      try {
        await prisma.userQuestionFlag.deleteMany({
          where: { userId, questionId },
        })
      } catch (e: any) {
        if (e?.code === "P2021") {
          return NextResponse.json({ ok: true, flagged, persisted: false })
        }
        throw e
      }
    }

    return NextResponse.json({ ok: true, flagged, persisted: true })
  } catch (e) {
    console.error("flag question failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}