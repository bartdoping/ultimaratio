// app/(dashboard)/subscription/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { SubscriptionManagement } from "@/components/subscription-management"

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Abonnement verwalten</h1>
        <SubscriptionManagement />
      </div>
    </div>
  )
}
