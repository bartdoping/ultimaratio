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
    const mid = formData.get("mid") as string

    await prisma.questionMedia.delete({
      where: { questionId_mediaId: { questionId: qid, mediaId: mid } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing image:", error)
    return NextResponse.json({ error: "Failed to remove image" }, { status: 500 })
  }
}
