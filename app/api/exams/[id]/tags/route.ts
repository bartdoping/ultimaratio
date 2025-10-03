import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET: Verfügbare Tags für ein spezifisches Exam
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Prüfe ob Exam existiert
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    // Finde alle Tags, die in diesem Exam verwendet werden
    const examTags = await prisma.questionTag.findMany({
      where: {
        question: {
          examId: id
        }
      },
      select: {
        tag: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },
      distinct: ['tagId']
    })

    // Gruppiere Tags nach Supertags
    const superTags = new Map<string, {
      id: string
      name: string
      slug: string
      children: Array<{
        id: string
        name: string
        slug: string
        parentId: string
      }>
    }>()

    const normalTags = new Map<string, {
      id: string
      name: string
      slug: string
      parentId: string | null
      parent?: {
        id: string
        name: string
        slug: string
      }
    }>()

    examTags.forEach(({ tag }) => {
      if (!tag.parentId) {
        // Das ist ein Supertag
        if (!superTags.has(tag.id)) {
          superTags.set(tag.id, {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            children: []
          })
        }
      } else {
        // Das ist ein normales Tag
        normalTags.set(tag.id, {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          parentId: tag.parentId,
          parent: tag.parent || undefined
        })

        // Füge es zu seinem Supertag hinzu
        if (tag.parent) {
          // Stelle sicher, dass der Supertag existiert
          if (!superTags.has(tag.parent.id)) {
            superTags.set(tag.parent.id, {
              id: tag.parent.id,
              name: tag.parent.name,
              slug: tag.parent.slug,
              children: []
            })
          }
          superTags.get(tag.parent.id)!.children.push({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            parentId: tag.parentId
          })
        }
      }
    })

    // Konvertiere Maps zu Arrays
    const superTagsArray = Array.from(superTags.values())
    const normalTagsArray = Array.from(normalTags.values())

    // Erstelle ein einheitliches Format für die TagPicker-Komponente
    const allTags = [
      ...superTagsArray.map(st => ({
        id: st.id,
        name: st.name,
        slug: st.slug,
        isSuper: true,
        parentId: null,
        parent: null,
        children: st.children
      })),
      ...normalTagsArray.map(nt => ({
        id: nt.id,
        name: nt.name,
        slug: nt.slug,
        isSuper: false,
        parentId: nt.parentId,
        parent: nt.parent,
        children: []
      }))
    ]

    return NextResponse.json({ 
      tags: allTags,
      superTags: superTagsArray,
      normalTags: normalTagsArray
    })
  } catch (error) {
    console.error("Error fetching exam tags:", error)
    return NextResponse.json({ error: "Failed to fetch exam tags" }, { status: 500 })
  }
}
