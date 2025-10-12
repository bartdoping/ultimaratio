// app/admin/sync-subscriptions/page.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SyncSubscriptionsPage() {
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    if (!userId.trim()) {
      alert("Bitte User-ID eingeben")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/force-sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: userId.trim() })
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Sync failed:", error)
      setResult({ error: "Sync failed: " + (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Abonnement synchronisieren</CardTitle>
          <CardDescription>
            Synchronisiere Abonnement-Daten für einen spezifischen User mit Stripe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userId">User-ID</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User-ID eingeben..."
            />
          </div>
          
          <Button 
            onClick={handleSync} 
            disabled={loading || !userId.trim()}
            className="w-full"
          >
            {loading ? "Synchronisiere..." : "Abonnement synchronisieren"}
          </Button>

          {result && (
            <Alert>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
