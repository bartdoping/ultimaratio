// components/subscription-status.tsx
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"

interface SubscriptionData {
  status: "free" | "pro"
  isPro: boolean
  questionsRemaining: number
  dailyQuestionsUsed: number
}

export function SubscriptionStatus() {
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
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
  }

  useEffect(() => {
    if (!session?.user?.email) return
    fetchStatus()
  }, [session])

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
          <span className="mr-1">👑</span>
          Pro
        </Badge>
      ) : (
        <div className="text-sm text-muted-foreground">
          {subscription.questionsRemaining > 0 ? (
            <span>
              {subscription.questionsRemaining} Fragen übrig
            </span>
          ) : (
            <span className="text-orange-600 font-medium">
              Limit erreicht
            </span>
          )}
        </div>
      )}
    </div>
  )
}
