"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface ActivateExamButtonProps {
  examId: string
  examTitle: string
  isActivated?: boolean
  className?: string
}

export function ActivateExamButton({ 
  examId, 
  examTitle, 
  isActivated = false,
  className 
}: ActivateExamButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleActivate = async () => {
    if (isActivated) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/exams/${examId}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.upgradeRequired) {
          // Zeige Upgrade-Popup
          toast.error(data.message, {
            description: "Klicke hier um zu upgraden",
            action: {
              label: "Upgrade zu Pro",
              onClick: () => {
                window.location.href = "/api/stripe/subscription/checkout"
              }
            }
          })
        } else {
          toast.error(data.error || "Fehler beim Aktivieren")
        }
        return
      }

      toast.success(data.message || "Prüfung erfolgreich aktiviert")
      router.refresh() // Seite aktualisieren
    } catch (error) {
      console.error("Error activating exam:", error)
      toast.error("Fehler beim Aktivieren der Prüfung")
    } finally {
      setIsLoading(false)
    }
  }

  if (isActivated) {
    return (
      <Button disabled className={className}>
        ✓ Aktiviert
      </Button>
    )
  }

  return (
    <Button 
      onClick={handleActivate}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? "Aktiviere..." : "Aktivieren"}
    </Button>
  )
}
