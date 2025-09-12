import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { initCategoriesTables } from "@/lib/init-categories-tables"
import CategoryManager from "./_client-category-manager"

export default async function AdminCategoriesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== "admin") {
    redirect("/")
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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Kategorie-Management</h1>
        <p className="text-muted-foreground mt-2">
          Verwalte Kategorien für die Organisation von Prüfungen
        </p>
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  )
}
