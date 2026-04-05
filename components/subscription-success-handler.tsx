"use client"

import { useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

export function SubscriptionSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ranRef = useRef(false)

  useEffect(() => {
    const subscription = searchParams.get("subscription")
    const stripeSessionId = searchParams.get("session_id")

    if (subscription === "cancelled") {
      toast.info("Abonnement abgebrochen", {
        description: "Du kannst jederzeit wieder ein Pro-Abonnement abschließen.",
        duration: 3000,
      })
      return
    }

    if (subscription !== "success") return
    if (ranRef.current) return
    ranRef.current = true

    const run = async () => {
      if (stripeSessionId) {
        try {
          const res = await fetch("/api/stripe/subscription/complete-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sessionId: stripeSessionId }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            console.warn("complete-checkout:", data)
          }
        } catch (e) {
          console.error("complete-checkout fetch failed:", e)
        }
      }

      window.dispatchEvent(new CustomEvent("fragenkreuzen:subscription-updated"))

      toast.success("🎉 Abonnement erfolgreich aktiviert!", {
        description:
          "Du hast jetzt Zugang zu allen Prüfungsfragen und kannst unbegrenzt üben.",
        duration: 5000,
      })

      router.replace("/dashboard", { scroll: false })
    }

    void run()
  }, [searchParams, router])

  return null
}
