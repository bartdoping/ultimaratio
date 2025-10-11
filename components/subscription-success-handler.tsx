"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function SubscriptionSuccessHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const subscription = searchParams.get("subscription")
    
    if (subscription === "success") {
      toast.success("🎉 Abonnement erfolgreich aktiviert!", {
        description: "Du hast jetzt Zugang zu allen Prüfungsfragen und kannst unbegrenzt üben.",
        duration: 5000,
      })
    } else if (subscription === "cancelled") {
      toast.info("Abonnement abgebrochen", {
        description: "Du kannst jederzeit wieder ein Pro-Abonnement abschließen.",
        duration: 3000,
      })
    }
  }, [searchParams])

  return null
}
