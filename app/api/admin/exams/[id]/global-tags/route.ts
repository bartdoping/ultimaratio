// app/api/admin/exams/[id]/global-tags/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { applyGlobalTagsToAllQuestions, removeGlobalTagsFromAllQuestions } from "@/lib/apply-global-tags"
import { initGlobalTagsTable } from "@/lib/init-global-tags-table"

export const runtime = "nodejs"

// GET: Globale Tags eines Examens laden
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Initialisiere Tabelle falls nötig
  await initGlobalTagsTable()

  const { id } = await params
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: {
      id: true,
      globalTags: {
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

  if (!exam) {
    return NextResponse.json({ error: "exam not found" }, { status: 404 })
  }

  // Simuliere isSuper und formatiere Tags
  const tags = exam.globalTags.map(gt => ({
    ...gt.tag,
    isSuper: !gt.tag.parentId
  }))

  return NextResponse.json({ tags })
}

// POST: Globale Tags zu einem Examen hinzufügen
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Initialisiere Tabelle falls nötig
  await initGlobalTagsTable()

  const { id } = await params
  const { tagIds } = await req.json().catch(() => ({}))
  
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return NextResponse.json({ error: "tagIds array required" }, { status: 400 })
  }

  // Prüfe ob Examen existiert
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: { id: true }
  })
  if (!exam) {
    return NextResponse.json({ error: "exam not found" }, { status: 404 })
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
    // Globale Tags hinzufügen (upsert um Duplikate zu vermeiden)
    await prisma.$transaction(
      tagIds.map(tagId =>
        prisma.examGlobalTag.upsert({
          where: {
            examId_tagId: {
              examId: id,
              tagId
            }
          },
          update: {},
          create: {
            examId: id,
            tagId
          }
        })
      )
    )

    // Automatisch alle bestehenden Fragen des Examens mit diesen Tags versehen
    const applyResult = await applyGlobalTagsToAllQuestions(id)
    if (!applyResult.success) {
      console.error("Failed to apply global tags:", applyResult.error)
      // Wir geben trotzdem success zurück, da die globalen Tags gespeichert wurden
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error adding global tags:", error)
    return NextResponse.json({ error: "failed to add global tags" }, { status: 500 })
  }
}

// DELETE: Globalen Tag von einem Examen entfernen
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Initialisiere Tabelle falls nötig
  await initGlobalTagsTable()

  const { id } = await params
  const { tagId } = await req.json().catch(() => ({}))
  
  if (!tagId) {
    return NextResponse.json({ error: "tagId required" }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Entferne globalen Tag
      await tx.examGlobalTag.deleteMany({
        where: {
          examId: id,
          tagId
        }
      })
    })

    // Entferne Tag von allen Fragen des Examens
    const removeResult = await removeGlobalTagsFromAllQuestions(id, tagId)
    if (!removeResult.success) {
      console.error("Failed to remove global tags from questions:", removeResult.error)
      // Wir geben trotzdem success zurück, da der globale Tag entfernt wurde
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error removing global tag:", error)
    return NextResponse.json({ error: "failed to remove global tag" }, { status: 500 })
  }
}
