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
    const url = formData.get("url") as string
    const alt = formData.get("alt") as string

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    const asset = await prisma.mediaAsset.upsert({
      where: { url },
      update: { alt: alt || null },
      create: { url, alt: alt || null, kind: "image" },
    })

    const agg = await prisma.questionMedia.aggregate({
      where: { questionId: qid },
      _max: { order: true },
    })
    const nextOrder = (agg._max.order ?? 0) + 1

    const existing = await prisma.questionMedia.findUnique({
      where: { questionId_mediaId: { questionId: qid, mediaId: asset.id } },
    })
    if (!existing) {
      await prisma.questionMedia.create({
        data: { questionId: qid, mediaId: asset.id, order: nextOrder },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error attaching image:", error)
    return NextResponse.json({ error: "Failed to attach image" }, { status: 500 })
  }
}
