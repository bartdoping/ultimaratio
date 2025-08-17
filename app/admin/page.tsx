// app/admin/page.tsx
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== "admin") redirect("/")

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin-Panel</h1>
      <p className="text-muted-foreground">M7: CRUD für Exams, Fragen, Preise, Medien-Upload.</p>
    </div>
  )
}
