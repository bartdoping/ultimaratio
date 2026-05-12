import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireAdminJson } from "@/lib/authz"

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    const formData = await req.formData()
    const examId = formData.get("examId") as string
    const qid = formData.get("qid") as string
    const stem = formData.get("stem") as string

    if (!examId || !qid || !stem) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const result = await prisma.question.updateMany({
      where: { id: qid, examId },
      data: { stem },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating question stem:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
