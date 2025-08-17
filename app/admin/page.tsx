// app/admin/page.tsx
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
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
      <div className="flex gap-3">
        <Button asChild><Link href="/admin/exams">Prüfungen</Link></Button>
        <Button variant="outline" asChild><Link href="/admin/labs">Laborwerte</Link></Button>
      </div>
    </div>
  )
}
