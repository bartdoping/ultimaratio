"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface DeleteAttemptButtonProps {
  attemptId: string
}

export function DeleteAttemptButton({ attemptId }: DeleteAttemptButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/attempts/${attemptId}/delete`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Seite neu laden, um die aktualisierte Liste anzuzeigen
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Fehler beim Löschen: ${error.error || 'Unbekannter Fehler'}`)
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Prüfungsdurchlaufs:', error)
      alert('Fehler beim Löschen des Prüfungsdurchlaufs')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Lösche..." : "Bestätigen"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
        >
          Abbrechen
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowConfirm(true)}
      disabled={isDeleting}
    >
      Prüfung entfernen
    </Button>
  )
}
