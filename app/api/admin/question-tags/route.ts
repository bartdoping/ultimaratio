import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireAdminJson } from "@/lib/authz"

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    const { searchParams } = new URL(req.url)
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 })
    }

    // Lade Tags der Frage
    const questionTags = await prisma.questionTag.findMany({
      where: { questionId },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true
          }
        }
      }
    })

    const tags = questionTags.map(qt => ({
      id: qt.tag.id,
      name: qt.tag.name,
      slug: qt.tag.slug,
      isSuper: !qt.tag.parentId,
      parentId: qt.tag.parentId
    }))

    return NextResponse.json({ tags })

  } catch (error) {
    console.error("Get question tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    const body = await req.json()
    const { questionId, tagId } = body

    if (!questionId || !tagId) {
      return NextResponse.json({ error: "questionId and tagId are required" }, { status: 400 })
    }

    // Prüfe ob die Zuordnung bereits existiert
    const existingLink = await prisma.questionTag.findFirst({
      where: { questionId, tagId }
    })

    if (existingLink) {
      return NextResponse.json({ error: "Tag already assigned to question" }, { status: 409 })
    }

    // Erstelle die Zuordnung
    await prisma.questionTag.create({
      data: { questionId, tagId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Assign tag to question error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    const body = await req.json()
    const { questionId, tagId } = body

    if (!questionId || !tagId) {
      return NextResponse.json({ error: "questionId and tagId are required" }, { status: 400 })
    }

    // Entferne die Zuordnung
    await prisma.questionTag.deleteMany({
      where: { questionId, tagId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Remove tag from question error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
