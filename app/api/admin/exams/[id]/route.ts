import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/db"
import { initCategoriesTables } from "@/lib/init-categories-tables"

// PATCH: Exam-Kategorie aktualisieren
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Stelle sicher, dass die Tabellen existieren
    await initCategoriesTables()

    const { id } = await params
    const { categoryId } = await req.json()

    // Prüfe ob Exam existiert
    const existingExam = await prisma.exam.findUnique({
      where: { id }
    })

    if (!existingExam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    // Prüfe ob Kategorie existiert (falls eine zugewiesen wird)
    if (categoryId) {
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId }
      })

      if (!existingCategory) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        categoryId: categoryId || null
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json({ exam })
  } catch (error) {
    console.error("Error updating exam category:", error)
    return NextResponse.json({ error: "Failed to update exam category" }, { status: 500 })
  }
}
