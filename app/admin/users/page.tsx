import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import UsersList from "@/components/admin/users-list"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || (session.user as any)?.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Verwalte alle registrierten Benutzer
        </p>
      </div>
      
      <UsersList />
    </div>
  )
}
