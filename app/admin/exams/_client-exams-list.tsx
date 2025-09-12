"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import ConfirmDeleteButton from "@/components/admin/confirm-delete-button"
import AssignCategoryButton from "@/components/admin/assign-category-button"

interface Exam {
  id: string
  slug: string
  title: string
  isPublished: boolean
  priceCents: number
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
}

export default function AdminExamsList({ 
  exams, 
  categories, 
  deleteExamAction 
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
              {e.slug} · {(e.priceCents / 100).toFixed(2)} € · {e.isPublished ? "veröffentlicht" : "Entwurf"}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
