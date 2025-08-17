// app/admin/labs/page.tsx
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

async function addLabAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const name = String(formData.get("name") || "")
  const refRange = String(formData.get("refRange") || "")
  const unit = String(formData.get("unit") || "")
  const category = String(formData.get("category") || "")
  await prisma.labValue.create({ data: { name, refRange, unit, category } })
  redirect("/admin/labs")
}

async function deleteLabAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const id = String(formData.get("id") || "")
  await prisma.labValue.delete({ where: { id } })
  redirect("/admin/labs")
}

export default async function AdminLabsPage() {
  await requireAdmin()
  const labs = await prisma.labValue.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] })

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Laborwerte</h1>

      <form action={addLabAction} className="grid sm:grid-cols-2 gap-3 rounded border p-3">
        <div><Label>Name</Label><Input name="name" required /></div>
        <div><Label>Kategorie</Label><Input name="category" required /></div>
        <div><Label>Referenzbereich</Label><Input name="refRange" required /></div>
        <div><Label>Einheit</Label><Input name="unit" required /></div>
        <div className="sm:col-span-2">
          <Button type="submit">Hinzufügen</Button>
        </div>
      </form>

      <div className="divide-y rounded border">
        {labs.map(l => (
          <div key={l.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{l.name}</div>
              <div className="text-sm text-muted-foreground">{l.category} · {l.refRange} {l.unit}</div>
            </div>
            <form action={deleteLabAction}>
              <input type="hidden" name="id" value={l.id} />
              <Button variant="destructive">Löschen</Button>
            </form>
          </div>
        ))}
        {labs.length === 0 && <div className="p-3 text-sm text-muted-foreground">Noch keine Laborwerte.</div>}
      </div>
    </div>
  )
}
