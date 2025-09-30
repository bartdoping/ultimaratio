import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    
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
