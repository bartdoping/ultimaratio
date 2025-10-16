// app/admin/exams/page.tsx
import prisma from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/authz"
import { Button } from "@/components/ui/button"
import ConfirmDeleteButton from "@/components/admin/confirm-delete-button"
import AssignCategoryButton from "@/components/admin/assign-category-button"
import { initCategoriesTables } from "@/lib/init-categories-tables"
import AdminExamsList from "./_client-exams-list"

async function deleteExamAction(formData: FormData) {
  "use server"
  await requireAdmin()

  const id = String(formData.get("id") || "")
  const confirmed = String(formData.get("confirmed") || "") === "yes"

  // Serverseitige Absicherung: nur löschen, wenn Confirm gesetzt wurde
  if (!confirmed) {
    redirect("/admin/exams")
  }

  await prisma.exam.delete({ where: { id } })
  redirect("/admin/exams")
}

export default async function AdminExamsPage() {
  await requireAdmin()
  
  // Stelle sicher, dass die Tabellen existieren
  await initCategoriesTables()
  
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    select: { 
      id: true, 
      slug: true, 
      title: true, 
      isPublished: true, 
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true
        }
      }
    },
  })

  const categories = await prisma.category.findMany({
    orderBy: [
      { order: "asc" },
      { name: "asc" }
    ]
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prüfungen</h1>
        <Button asChild><Link href="/admin/exams/new">Neue Prüfung</Link></Button>
      </div>

      <AdminExamsList 
        exams={exams}
        categories={categories}
        deleteExamAction={deleteExamAction}
      />
    </div>
  )
}