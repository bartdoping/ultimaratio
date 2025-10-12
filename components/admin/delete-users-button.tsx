"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DeleteUsersButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleDeleteAllUsers = async () => {
    if (!confirm("⚠️ WARNUNG: Diese Aktion löscht ALLE User außer Admins! Fortfahren?")) {
      return
    }

    if (!confirm("⚠️ LETZTE WARNUNG: Diese Aktion kann NICHT rückgängig gemacht werden! Wirklich fortfahren?")) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/delete-all-users", {
        method: "DELETE",
        credentials: "include"
      })
      
      const data = await response.json()
      
      if (data.ok) {
        setResult(`✅ Erfolgreich gelöscht: ${data.deletedCount} User`)
      } else {
        setResult(`❌ Fehler: ${data.error || "Unbekannter Fehler"}`)
      }
    } catch (error) {
      console.error("Delete users failed:", error)
      setResult(`❌ Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button 
        variant="destructive" 
        size="lg"
        onClick={handleDeleteAllUsers}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Lösche User..." : "🚨 ALLE USER LÖSCHEN"}
      </Button>

      {result && (
        <Alert>
          <AlertDescription>
            {result}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
