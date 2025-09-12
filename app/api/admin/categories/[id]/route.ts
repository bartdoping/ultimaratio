import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/db"
import { initCategoriesTables } from "@/lib/init-categories-tables"

// PUT: Kategorie aktualisieren
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Stelle sicher, dass die Tabellen existieren
    await initCategoriesTables()

    const { id } = await params
    const { name, description, color, order } = await req.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Prüfe ob Kategorie existiert
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Prüfe ob Name bereits von einer anderen Kategorie verwendet wird
    const nameConflict = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    })

    if (nameConflict) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color?.trim() || null,
        order: order || 0
      }
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

// DELETE: Kategorie löschen
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Stelle sicher, dass die Tabellen existieren
    await initCategoriesTables()

    const { id } = await params

    // Prüfe ob Kategorie existiert
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            exams: true
          }
        }
      }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Prüfe ob Kategorie noch Prüfungen hat
    if (existingCategory._count.exams > 0) {
      return NextResponse.json({ 
        error: "Cannot delete category with existing exams. Please reassign or delete exams first." 
      }, { status: 400 })
    }

    await prisma.category.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
