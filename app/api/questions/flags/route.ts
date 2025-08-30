// app/api/questions/flags/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const url = new URL(req.url)
    const idsParam = url.searchParams.get("ids") || ""
    const ids = idsParam.split(",").map(s => s.trim()).filter(Boolean)

    if (ids.length === 0) return NextResponse.json({ flags: {} })

    try {
      const rows = await prisma.userQuestionFlag.findMany({
        where: { userId, questionId: { in: ids } },
        select: { questionId: true },
      })
      const flags: Record<string, boolean> = {}
      for (const r of rows) flags[r.questionId] = true
      return NextResponse.json({ flags })
    } catch (e: any) {
      // P2021: Tabelle existiert (noch) nicht -> leer zurückgeben statt 500
      if (e?.code === "P2021") return NextResponse.json({ flags: {} })
      throw e
    }
  } catch (e) {
    console.error("flags fetch failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}