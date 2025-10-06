import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import DeleteUsersButton from "./delete-users-button"

export default async function DeleteUsersPage() {
  const session = await getServerSession(authOptions)
  
  if ((session?.user as any)?.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
        
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
            ⚠️ Alle User löschen
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Diese Aktion löscht <strong>alle User-Accounts</strong> außer dem Admin-Account (info@ultima-rat.io).
            Diese Aktion kann nicht rückgängig gemacht werden!
          </p>
          <DeleteUsersButton />
        </div>
      </div>
    </div>
  )
}
