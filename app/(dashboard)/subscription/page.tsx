// app/(dashboard)/subscription/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { SubscriptionManagement } from "@/components/subscription-management"
import { SettingsShell } from "@/components/settings/settings-shell"

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  return (
    <SettingsShell
      title="Abonnement"
      description="Tarif, Laufzeit und Pro-Funktionen im Überblick."
    >
      <SubscriptionManagement />
    </SettingsShell>
  )
}
