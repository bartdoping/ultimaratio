"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ConfirmDeleteButton from "@/components/admin/confirm-delete-button"
import AssignCategoryButton from "@/components/admin/assign-category-button"

interface Exam {
  id: string
  slug: string
  title: string
  isPublished: boolean
  priceCents: number | null
  isFreeTrialDemo: boolean
  /** false = nicht auf der öffentlichen Seite /exams gelistet */
  visibleOnExamsPage: boolean
  categoryId: string | null
  category: {
    id: string
    name: string
    color: string | null
  } | null
  contentHealth: {
    score: number
    tone: "good" | "warning" | "critical" | "empty"
    summary: string
    issues: string[]
    totalQuestions: number
  }
}

interface Category {
  id: string
  name: string
  color: string | null
}

interface AdminExamsListProps {
  exams: Exam[]
  categories: Category[]
  deleteExamAction: (formData: FormData) => Promise<void>
  setExamVisibleOnExamsPageAction: (formData: FormData) => Promise<void>
  updateExamPriceAction: (formData: FormData) => Promise<void>
  setExamPublishedAction: (formData: FormData) => Promise<void>
  renameExamAction: (formData: FormData) => Promise<void>
  /** false, wenn die DB-Migration für visibleOnExamsPage noch fehlt */
  examsPageVisibilityColumnReady?: boolean
}

export default function AdminExamsList({ 
  exams, 
  categories, 
  deleteExamAction,
  setExamVisibleOnExamsPageAction,
  updateExamPriceAction,
  setExamPublishedAction,
  renameExamAction,
  examsPageVisibilityColumnReady = true,
}: AdminExamsListProps) {
  const handleCategoryAssigned = () => {
    window.location.reload()
  }

  const contentHealthClass = (tone: Exam["contentHealth"]["tone"]) => {
    if (tone === "good") return "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
    if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
    if (tone === "critical") return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    return "border-muted bg-muted/30 text-muted-foreground"
  }

  return (
    <div className="space-y-3">
      {exams.map(e => (
        <div key={e.id} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div>
                <div className="font-semibold text-lg leading-tight">{e.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5">{e.slug}</code>
                  {e.category?.name ? ` · ${e.category.name}` : " · Keine Kategorie"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 ${e.isPublished ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                  {e.isPublished ? "Veröffentlicht" : "Entwurf"}
                </span>
                {e.isFreeTrialDemo && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Probedeck</span>
                )}
                {examsPageVisibilityColumnReady && e.isPublished && (
                  <span className={`rounded-full px-2.5 py-1 ${e.visibleOnExamsPage ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                    {e.visibleOnExamsPage ? "Auf /exams sichtbar" : "Auf /exams ausgeblendet"}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {e.priceCents != null && e.priceCents > 0
                    ? `${(e.priceCents / 100).toFixed(2).replace(".", ",")} EUR`
                    : "Kein Einzelpreis"}
                </span>
              </div>
              <div className={`rounded-lg border px-3 py-2 text-sm ${contentHealthClass(e.contentHealth.tone)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Content-Health: {e.contentHealth.score}%</span>
                  <span className="text-xs opacity-80">{e.contentHealth.totalQuestions} Fragen</span>
                </div>
                <div className="mt-1 text-xs opacity-90">{e.contentHealth.summary}</div>
                {e.contentHealth.issues.length > 2 && (
                  <div className="mt-1 text-xs opacity-80">
                    +{e.contentHealth.issues.length - 2} weitere Hinweise im Frageneditor prüfen
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 xl:w-[42rem]">
              <div className="grid gap-2 sm:grid-cols-2">
                <form
                  action={renameExamAction}
                  className="rounded-lg border bg-muted/20 p-3 space-y-2"
                >
                  <input type="hidden" name="examId" value={e.id} />
                  <label className="text-xs font-medium text-muted-foreground">
                    Titel
                  </label>
                  <div className="flex gap-2">
                    <Input
                      name="title"
                      type="text"
                      defaultValue={e.title}
                      className="h-9 text-sm"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      Speichern
                    </Button>
                  </div>
                </form>

                <form
                  action={updateExamPriceAction}
                  className="rounded-lg border bg-muted/20 p-3 space-y-2"
                >
                  <input type="hidden" name="examId" value={e.id} />
                  <label className="text-xs font-medium text-muted-foreground">
                    Einzelpreis
                  </label>
                  <div className="flex gap-2">
                    <Input
                      name="priceEur"
                      type="text"
                      inputMode="decimal"
                      placeholder="z. B. 9,99"
                      defaultValue={
                        e.priceCents != null && e.priceCents > 0
                          ? (e.priceCents / 100).toFixed(2).replace(".", ",")
                          : ""
                      }
                      className="h-9 text-sm"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      Speichern
                    </Button>
                  </div>
                </form>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <form action={setExamPublishedAction}>
                  <input type="hidden" name="examId" value={e.id} />
                  <input type="hidden" name="published" value={e.isPublished ? "0" : "1"} />
                  <Button type="submit" variant={e.isPublished ? "secondary" : "default"} size="sm">
                    {e.isPublished ? "Entveröffentlichen" : "Veröffentlichen"}
                  </Button>
                </form>

                {examsPageVisibilityColumnReady && e.isPublished && (
                  <form action={setExamVisibleOnExamsPageAction}>
                    <input type="hidden" name="examId" value={e.id} />
                    <input type="hidden" name="visible" value={e.visibleOnExamsPage ? "0" : "1"} />
                    <Button type="submit" variant="secondary" size="sm" title="Steuert nur die öffentliche Übersicht /exams; Prüfungsinhalte bleiben unverändert.">
                      {e.visibleOnExamsPage ? "Auf /exams ausblenden" : "Auf /exams anzeigen"}
                    </Button>
                  </form>
                )}
                <AssignCategoryButton
                  examId={e.id}
                  examTitle={e.title}
                  currentCategoryId={e.categoryId}
                  categories={categories}
                  onCategoryAssigned={handleCategoryAssigned}
                />
                
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/exams/${e.id}`}>Fragen bearbeiten</Link>
                </Button>

                <form action={deleteExamAction}>
                  <input type="hidden" name="id" value={e.id} />
                  {/* Hard Guard für die Server-Action */}
                  <input type="hidden" name="confirmed" value="yes" />
                  <ConfirmDeleteButton
                    message={`Prüfung „${e.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
                  >
                    Löschen
                  </ConfirmDeleteButton>
                </form>
              </div>
            </div>
          </div>
        </div>
      ))}
      {exams.length === 0 && (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Noch keine Prüfungen angelegt.
        </div>
      )}
    </div>
  )
}
