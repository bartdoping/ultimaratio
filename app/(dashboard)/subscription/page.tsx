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
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Abo</div>
            <h1 className="text-3xl font-semibold tracking-tight">Abonnement verwalten</h1>
            <p className="text-sm text-muted-foreground">
              Prüfe deinen aktuellen Tarif, verwalte Pro und behalte Laufzeiten im Blick.
            </p>
          </div>
        </div>
        <SubscriptionManagement />
      </div>
    </div>
  )
}
