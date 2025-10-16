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
    const stem = formData.get("stem") as string

    if (!examId || !qid || !stem) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    await prisma.question.update({
      where: { id: qid },
      data: { stem },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating question stem:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
