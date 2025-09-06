// app/api/admin/questions/[id]/tags/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

// GET: Tags einer Frage laden
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const question = await prisma.question.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              parent: {
                select: { id: true, name: true, slug: true }
              }
            }
          }
        }
      }
    }
  })

  if (!question) {
    return NextResponse.json({ error: "question not found" }, { status: 404 })
  }

  // Simuliere isSuper basierend auf parentId
  const tags = question.tags.map(qt => ({
    ...qt.tag,
    isSuper: !qt.tag.parentId
  }))
  
  return NextResponse.json({ tags })
}

// POST: Tags zu einer Frage hinzufügen
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { tagIds } = await req.json().catch(() => ({}))
  
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return NextResponse.json({ error: "tagIds array required" }, { status: 400 })
  }

  // Validierung: Jeder Tag muss existieren
  const existingTags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true }
  })

  if (existingTags.length !== tagIds.length) {
    return NextResponse.json({ error: "some tags do not exist" }, { status: 400 })
  }

  try {
    // Tags hinzufügen (upsert um Duplikate zu vermeiden)
    await prisma.$transaction(
      tagIds.map(tagId =>
        prisma.questionTag.upsert({
          where: {
            questionId_tagId: {
              questionId: params.id,
              tagId
            }
          },
          update: {},
          create: {
            questionId: params.id,
            tagId
          }
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "failed to add tags" }, { status: 500 })
  }
}

// DELETE: Tag von einer Frage entfernen
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { tagId } = await req.json().catch(() => ({}))
  
  if (!tagId) {
    return NextResponse.json({ error: "tagId required" }, { status: 400 })
  }

  try {
    await prisma.questionTag.deleteMany({
      where: {
        questionId: params.id,
        tagId
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "failed to remove tag" }, { status: 500 })
  }
}
