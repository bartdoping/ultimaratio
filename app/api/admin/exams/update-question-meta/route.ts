import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const examId = formData.get("examId") as string
    const qid = formData.get("qid") as string
    const explanation = formData.get("explanation") as string
    const tip = formData.get("tip") as string
    const allowImmediate = formData.get("allowImmediate") === "on"

    if (!examId || !qid) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    await prisma.question.update({
      where: { id: qid },
      data: { 
        explanation: explanation || null,
        tip: tip || null,
        hasImmediateFeedbackAllowed: allowImmediate,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating question meta:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
