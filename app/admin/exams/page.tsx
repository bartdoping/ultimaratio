// app/admin/exams/page.tsx
import prisma from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/authz"
import { Button } from "@/components/ui/button"
import ConfirmDeleteButton from "@/components/admin/confirm-delete-button"

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
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, isPublished: true, priceCents: true },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prüfungen</h1>
        <Button asChild><Link href="/admin/exams/new">Neue Prüfung</Link></Button>
      </div>

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
              <Button variant="outline" asChild>
                <Link href={`/admin/exams/${e.id}`}>Bearbeiten</Link>
              </Button>

              <form action={deleteExamAction}>
                <input type="hidden" name="id" value={e.id} />
                {/* Hard Guard für die Server-Action */}
                <input type="hidden" name="confirmed" value="yes" />
                <ConfirmDeleteButton
                  message={`Prüfung „${e.title}“ wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
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
    </div>
  )
}