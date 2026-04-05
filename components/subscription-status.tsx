// components/subscription-status.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"

interface SubscriptionData {
  status: "free" | "pro"
  isPro: boolean
}

export function SubscriptionStatus() {
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/stripe/subscription/status", {
        credentials: "include"
      })
      const data = await response.json()
      
      if (data.ok) {
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.email) return
    void fetchStatus()
  }, [session, fetchStatus])

  // Nach Stripe-Rückkehr / complete-checkout sofort neu laden
  useEffect(() => {
    const onUpdate = () => {
      setLoading(true)
      void fetchStatus()
    }
    window.addEventListener("fragenkreuzen:subscription-updated", onUpdate)
    return () =>
      window.removeEventListener("fragenkreuzen:subscription-updated", onUpdate)
  }, [fetchStatus])

  // Aktualisiere Status alle 5 Sekunden
  useEffect(() => {
    if (!session?.user?.email) return
    
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [session])

  if (loading || !subscription) return null

  return (
    <div className="flex items-center gap-2">
      {subscription.isPro ? (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          Pro
        </Badge>
      ) : (
        <Badge variant="outline">Kostenlos</Badge>
      )}
    </div>
  )
}
