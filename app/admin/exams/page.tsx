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

/** Einmalpreis für Einzelkauf (Stripe); leer = kein Einzelverkauf. */
async function updateExamPriceAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const raw = String(formData.get("priceEur") ?? "").replace(",", ".").trim()
  if (!examId) return

  let priceCents: number | null = null
  if (raw !== "") {
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) {
      return
    }
    priceCents = Math.round(n * 100)
    if (priceCents === 0) priceCents = null
  }

  await prisma.exam.update({
    where: { id: examId },
    data: { priceCents },
  })
  revalidatePath("/exams")
  revalidatePath("/admin/exams")
  redirect("/admin/exams")
}

/** Veröffentlicht/entveröffentlicht eine Prüfung (steuert den Live-Zustand). */
async function setExamPublishedAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  if (!examId) return
  const published = String(formData.get("published") || "") === "1"
  await prisma.exam.update({
    where: { id: examId },
    data: { isPublished: published },
  })
  revalidatePath("/exams")
  revalidatePath("/admin/exams")
  redirect("/admin/exams")
}

/** Ändert den Titel/Name einer Prüfung. */
async function renameExamAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const title = String(formData.get("title") || "").trim()
  if (!examId) return
  if (!title) {
    redirect("/admin/exams")
  }
  await prisma.exam.update({
    where: { id: examId },
    data: { title },
  })
  revalidatePath("/exams")
  revalidatePath("/admin/exams")
  redirect("/admin/exams")
}

function computeContentHealth(exam: {
  questions: Array<{
    stem: string
    explanation: string | null
    caseId: string | null
    case: { vignette: string | null } | null
    options: Array<{ text: string; isCorrect: boolean; explanation: string | null }>
    tags: Array<{ tagId: string }>
  }>
}) {
  const totalQuestions = exam.questions.length
  if (totalQuestions === 0) {
    return {
      score: 0,
      tone: "empty" as const,
      summary: "Keine Fragen",
      issues: ["Noch keine Fragen angelegt"],
      totalQuestions,
    }
  }

  let missingQuestionExplanation = 0
  let optionProblems = 0
  let missingOptionExplanations = 0
  let untaggedQuestions = 0
  let caseTextProblems = 0

  for (const question of exam.questions) {
    if (!question.explanation?.trim()) missingQuestionExplanation += 1
    if (question.tags.length === 0) untaggedQuestions += 1
    if (question.caseId && !question.case?.vignette?.trim()) caseTextProblems += 1

    const correctCount = question.options.filter(option => option.isCorrect).length
    const hasEmptyOption = question.options.some(option => !option.text.trim())
    if (question.options.length < 2 || correctCount !== 1 || hasEmptyOption) {
      optionProblems += 1
    }
    if (question.options.some(option => !option.explanation?.trim())) {
      missingOptionExplanations += 1
    }
  }

  const weightedIssues =
    missingQuestionExplanation +
    optionProblems * 2 +
    missingOptionExplanations * 0.5 +
    untaggedQuestions +
    caseTextProblems * 2
  const maxIssues = Math.max(1, totalQuestions * 5.5)
  const score = Math.max(0, Math.round(100 - (weightedIssues / maxIssues) * 100))
  const issues = [
    missingQuestionExplanation > 0 ? `${missingQuestionExplanation} ohne Fragenerklärung` : null,
    optionProblems > 0 ? `${optionProblems} mit Optionsproblem` : null,
    missingOptionExplanations > 0 ? `${missingOptionExplanations} mit fehlenden Optionserklärungen` : null,
    untaggedQuestions > 0 ? `${untaggedQuestions} ohne Tags` : null,
    caseTextProblems > 0 ? `${caseTextProblems} Fallfragen ohne Falltext` : null,
  ].filter((issue): issue is string => Boolean(issue))

  return {
    score,
    tone: score >= 85 ? "good" as const : score >= 65 ? "warning" as const : "critical" as const,
    summary: issues.length > 0 ? issues.slice(0, 2).join(" · ") : "Keine offensichtlichen Lücken",
    issues,
    totalQuestions,
  }
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
      priceCents: true,
      isFreeTrialDemo: true,
      ...(examsPageVisibilityColumnReady ? { visibleOnExamsPage: true as const } : {}),
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      questions: {
        select: {
          stem: true,
          explanation: true,
          caseId: true,
          case: { select: { vignette: true } },
          options: { select: { text: true, isCorrect: true, explanation: true } },
          tags: { select: { tagId: true } },
        },
      },
    },
  })

  const exams = examsRaw.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    isPublished: row.isPublished,
    priceCents: row.priceCents,
    isFreeTrialDemo: row.isFreeTrialDemo,
    categoryId: row.categoryId,
    category: row.category,
    contentHealth: computeContentHealth(row),
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
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</div>
            <h1 className="text-2xl font-semibold tracking-tight">Prüfungen</h1>
            <p className="text-sm text-muted-foreground">
              Verwalte Prüfungen, Preise, Sichtbarkeit und Kategorien an einem Ort.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/exams/create">Neue Prüfung anlegen</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Einzelpreis:</strong> Wenn ein Preis gesetzt ist, können Nutzer ohne Pro-Abo
        diese Prüfung dauerhaft per Einmalzahlung freischalten. Leer lassen bedeutet: kein Einzelverkauf.
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
        updateExamPriceAction={updateExamPriceAction}
        setExamPublishedAction={setExamPublishedAction}
        renameExamAction={renameExamAction}
        examsPageVisibilityColumnReady={examsPageVisibilityColumnReady}
      />
    </div>
  )
}