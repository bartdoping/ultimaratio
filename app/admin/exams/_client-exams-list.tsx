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
  /** false, wenn die DB-Migration für visibleOnExamsPage noch fehlt */
  examsPageVisibilityColumnReady?: boolean
}

export default function AdminExamsList({ 
  exams, 
  categories, 
  deleteExamAction,
  setExamVisibleOnExamsPageAction,
  updateExamPriceAction,
  examsPageVisibilityColumnReady = true,
}: AdminExamsListProps) {
  const handleCategoryAssigned = () => {
    window.location.reload()
  }

  return (
    <div className="divide-y rounded border">
      {exams.map(e => (
        <div key={e.id} className="p-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{e.title}</div>
            <div className="text-sm text-muted-foreground">
              {e.slug} · {e.isPublished ? "veröffentlicht" : "Entwurf"}
              {e.isFreeTrialDemo && (
                <>
                  {" "}
                  · <span className="font-medium text-primary">Probedeck (Free)</span>
                </>
              )}
              {examsPageVisibilityColumnReady && e.isPublished && (
                <>
                  {" "}
                  ·{" "}
                  {e.visibleOnExamsPage ? (
                    <span className="text-foreground">in /exams sichtbar</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-500">nicht in /exams (unsichtbar)</span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <form
              action={updateExamPriceAction}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-2 py-2"
            >
              <input type="hidden" name="examId" value={e.id} />
              <label className="text-xs text-muted-foreground whitespace-nowrap">
                Einzelpreis (EUR)
              </label>
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
                className="h-8 w-24 text-sm"
              />
              <Button type="submit" variant="secondary" size="sm">
                Speichern
              </Button>
            </form>
            {examsPageVisibilityColumnReady && e.isPublished && (
              <form action={setExamVisibleOnExamsPageAction}>
                <input type="hidden" name="examId" value={e.id} />
                <input type="hidden" name="visible" value={e.visibleOnExamsPage ? "0" : "1"} />
                <Button type="submit" variant="secondary" size="sm" title="Steuert nur die öffentliche Übersicht /exams; Prüfungsinhalte bleiben unverändert.">
                  {e.visibleOnExamsPage ? "In /exams ausblenden" : "In /exams einblenden"}
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
            
            <Button variant="outline" asChild>
              <Link href={`/admin/exams/${e.id}`}>Bearbeiten</Link>
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
      ))}
      {exams.length === 0 && (
        <div className="p-3 text-sm text-muted-foreground">Noch keine Prüfungen.</div>
      )}
    </div>
  )
}
