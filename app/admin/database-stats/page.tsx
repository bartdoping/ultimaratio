import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import DatabaseStatsClient from "./database-stats-client"

export default async function DatabaseStatsPage() {
  const session = await getServerSession(authOptions)
  
  if ((session?.user as any)?.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Datenbank-Statistiken</h1>
        <DatabaseStatsClient />
      </div>
    </div>
  )
}
