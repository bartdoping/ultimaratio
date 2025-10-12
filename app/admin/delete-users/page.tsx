// app/admin/delete-users/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import DeleteUsersButton from "@/components/admin/delete-users-button"

export default async function DeleteUsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || (session.user as any)?.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-red-600">User löschen</h1>
        <p className="text-muted-foreground">
          ⚠️ Gefährliche Aktion: Löscht alle User außer Admins
        </p>
      </div>
      
      <div className="max-w-2xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-4">
            Alle User löschen
          </h2>
          <p className="text-red-700 mb-4">
            Diese Aktion löscht <strong>alle registrierten User</strong> außer den Admin-Accounts. 
            Alle Daten, Statistiken und Abonnements werden unwiderruflich gelöscht.
          </p>
          <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
            <p className="text-sm text-red-800">
              <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
            </p>
          </div>
          <DeleteUsersButton />
        </div>
      </div>
    </div>
  )
}