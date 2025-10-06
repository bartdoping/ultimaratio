// app/admin/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminHome() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== "admin") redirect("/")

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin-Panel</h1>
      <p className="text-muted-foreground">Verwalte Prüfungen, Fragen und Laborwerte.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="w-full sm:w-auto"><Link href="/admin/exams">Prüfungen</Link></Button>
        <Button variant="outline" asChild className="w-full sm:w-auto"><Link href="/admin/users">User</Link></Button>
        <Button variant="outline" asChild className="w-full sm:w-auto"><Link href="/admin/categories">Kategorien</Link></Button>
        <Button variant="outline" asChild className="w-full sm:w-auto"><Link href="/admin/labs">Laborwerte</Link></Button>
        <Button variant="outline" asChild className="w-full sm:w-auto"><Link href="/admin/tags">Tags</Link></Button>
      </div>
    </div>
  )
}
