import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/db"
import { initCategoriesTables } from "@/lib/init-categories-tables"

// GET: Alle Kategorien abrufen
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Stelle sicher, dass die Tabellen existieren
    await initCategoriesTables()

    const categories = await prisma.category.findMany({
      orderBy: [
        { order: "asc" },
        { name: "asc" }
      ],
      include: {
        _count: {
          select: {
            exams: true
          }
        }
      }
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

// POST: Neue Kategorie erstellen
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Stelle sicher, dass die Tabellen existieren
    await initCategoriesTables()

    const { name, description, color, order } = await req.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Prüfe ob Name bereits existiert
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() }
    })

    if (existingCategory) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color?.trim() || null,
        order: order || 0
      }
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}
