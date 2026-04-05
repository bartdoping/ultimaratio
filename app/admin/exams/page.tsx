// app/admin/exams/page.tsx
import prisma from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/authz"
import { Button } from "@/components/ui/button"
import ConfirmDeleteButton from "@/components/admin/confirm-delete-button"
import AssignCategoryButton from "@/components/admin/assign-category-button"
import { initCategoriesTables } from "@/lib/init-categories-tables"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
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

/** Sichtbarkeit auf der öffentlichen Prüfungsübersicht /exams (Inhalte der Prüfung bleiben unverändert). */
async function setExamVisibleOnExamsPageAction(formData: FormData) {
  "use server"
  await requireAdmin()
  if (!(await examVisibleOnExamsPageColumnExists())) {
    redirect("/admin/exams")
  }
  const id = String(formData.get("examId") || "")
  if (!id) return
  const visible = String(formData.get("visible") || "") === "1"
  await prisma.exam.update({
    where: { id },
    data: { visibleOnExamsPage: visible },
  })
  revalidatePath("/exams")
  revalidatePath("/admin/exams")
}

export default async function AdminExamsPage() {
  await requireAdmin()
  
  // Stelle sicher, dass die Tabellen existieren
  await initCategoriesTables()

  const examsPageVisibilityColumnReady = await examVisibleOnExamsPageColumnExists()

  const examsRaw = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      isPublished: true,
      ...(examsPageVisibilityColumnReady ? { visibleOnExamsPage: true as const } : {}),
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  })

  const exams = examsRaw.map((row) => ({
    ...row,
    visibleOnExamsPage:
      examsPageVisibilityColumnReady && "visibleOnExamsPage" in row && typeof row.visibleOnExamsPage === "boolean"
        ? row.visibleOnExamsPage
        : true,
  }))

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

      {!examsPageVisibilityColumnReady && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Die Datenbank-Spalte <code className="rounded bg-muted px-1">Exam.visibleOnExamsPage</code> fehlt noch.
          Bitte auf dem Server <code className="rounded bg-muted px-1">pnpm exec prisma migrate deploy</code> ausführen.
          Bis dahin ist die öffentliche Prüfungsübersicht unverändert (alle veröffentlichten Prüfungen sichtbar); die Schalter
          „In /exams ein-/ausblenden“ erscheinen nach der Migration.
        </div>
      )}

      <AdminExamsList 
        exams={exams}
        categories={categories}
        deleteExamAction={deleteExamAction}
        setExamVisibleOnExamsPageAction={setExamVisibleOnExamsPageAction}
        examsPageVisibilityColumnReady={examsPageVisibilityColumnReady}
      />
    </div>
  )
}