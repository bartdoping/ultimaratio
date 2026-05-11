"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DeleteAccountButton() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const userEmail = session?.user?.email || ""
  const expectedConfirmation = `LÖSCHEN ${userEmail.toUpperCase()}`

  const handleDelete = async () => {
    if (confirmationText !== expectedConfirmation) {
      setError("Der Bestätigungstext stimmt nicht überein.")
      return
    }

    if (!confirm("Finale Bestätigung: Dein gesamter Account wird unwiderruflich gelöscht. Fortfahren?")) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })

      const data = await response.json()

      if (data.ok) {
        alert("Account wurde gelöscht. Du wirst jetzt abgemeldet.")
        // Abmelden und zur Startseite weiterleiten
        await signOut({ callbackUrl: "/" })
      } else {
        setError(data.error || "Account konnte nicht gelöscht werden.")
      }
    } catch (error) {
      console.error("Delete account error:", error)
      setError("Account konnte nicht gelöscht werden.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!session?.user?.email) {
    return null
  }

  return (
    <Card className="border-red-200 bg-red-50/40 shadow-sm dark:border-red-900 dark:bg-red-950/10">
      <CardHeader>
        <CardTitle className="text-red-700 dark:text-red-300">Gefahrenbereich</CardTitle>
        <CardDescription>
          Lösche deinen Account nur, wenn du sicher bist. Diese Aktion kann nicht rückgängig gemacht werden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-white/70 dark:border-red-900 dark:bg-red-950/20">
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>Beim Löschen werden entfernt:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Prüfungsergebnisse und Statistiken</li>
              <li>Käufe, Abo-Daten und Zahlungshistorie</li>
              <li>Persönliche Einstellungen und Accountdaten</li>
            </ul>
          </AlertDescription>
        </Alert>

        {!isOpen ? (
          <Button 
            variant="destructive" 
            onClick={() => setIsOpen(true)}
            className="w-full"
          >
            Account löschen
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Gib zur Bestätigung exakt ein: <strong>LÖSCHEN {userEmail.toUpperCase()}</strong>
              </Label>
              <Input
                id="confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`LÖSCHEN ${userEmail.toUpperCase()}`}
                className="font-mono"
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-white/70 dark:border-red-900 dark:bg-red-950/20">
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsOpen(false)
                  setConfirmationText("")
                  setError(null)
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting || confirmationText !== expectedConfirmation}
                className="flex-1"
              >
                {isDeleting ? "Wird gelöscht..." : "Endgültig löschen"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
