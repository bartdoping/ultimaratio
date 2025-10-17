import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prüfe Admin-Status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { questionId } = await params

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
