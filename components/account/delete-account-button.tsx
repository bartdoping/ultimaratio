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
      setError("Bestätigungstext stimmt nicht überein")
      return
    }

    if (!confirm("⚠️ FINALE WARNUNG: Diese Aktion kann NICHT rückgängig gemacht werden!\n\nDein gesamter Account wird unwiderruflich gelöscht.")) {
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
        alert("Account wurde erfolgreich gelöscht. Du wirst jetzt abgemeldet.")
        // Abmelden und zur Startseite weiterleiten
        await signOut({ callbackUrl: "/" })
      } else {
        setError(data.error || "Fehler beim Löschen des Accounts")
      }
    } catch (error) {
      console.error("Delete account error:", error)
      setError("Fehler beim Löschen des Accounts")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!session?.user?.email) {
    return null
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">Account löschen</CardTitle>
        <CardDescription>
          Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden unwiderruflich gelöscht.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>⚠️ Warnung:</strong> Beim Löschen deines Accounts werden folgende Daten unwiderruflich entfernt:
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Alle deine Prüfungsergebnisse und Statistiken</li>
              <li>Deine Abonnement-Daten und Zahlungshistorie</li>
              <li>Deine persönlichen Einstellungen</li>
              <li>Alle anderen mit deinem Account verknüpften Daten</li>
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
                Zur Bestätigung gib bitte folgendes ein: <strong>LÖSCHEN {userEmail.toUpperCase()}</strong>
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
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
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
