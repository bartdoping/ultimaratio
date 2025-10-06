"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function DeleteUsersButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm("Bist du sicher? Alle User außer dem Admin werden gelöscht!")) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/delete-all-users", {
        method: "DELETE"
      })

      const data = await response.json()

      if (data.ok) {
        setResult(`✅ Erfolgreich gelöscht: ${data.deleted} User`)
      } else {
        setResult(`❌ Fehler: ${data.message || data.error}`)
      }
    } catch (error) {
      setResult(`❌ Fehler: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleDelete}
        disabled={loading}
        variant="destructive"
        className="w-full"
      >
        {loading ? "Lösche..." : "Alle User löschen (außer Admin)"}
      </Button>
      
      {result && (
        <div className="p-3 rounded bg-gray-100 dark:bg-gray-800">
          {result}
        </div>
      )}
    </div>
  )
}
