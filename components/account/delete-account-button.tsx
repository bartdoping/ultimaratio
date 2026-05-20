"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

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
        credentials: "include",
      })

      const data = await response.json()

      if (data.ok) {
        toast.success("Account wurde gelöscht", {
          description: "Du wirst jetzt abgemeldet.",
        })
        await signOut({ callbackUrl: "/" })
      } else {
        setError(data.error || "Account konnte nicht gelöscht werden.")
      }
    } catch (err) {
      console.error("Delete account error:", err)
      setError("Account konnte nicht gelöscht werden.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!session?.user?.email) {
    return null
  }

  return (
    <section className="rounded-xl border border-red-200/80 bg-red-50/50 p-5 shadow-sm dark:border-red-900/60 dark:bg-red-950/15">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Account löschen</h2>
        <p className="text-sm text-red-700/90 dark:text-red-300/90">
          Unwiderruflich. Alle Daten, Käufe und Statistiken werden entfernt.
        </p>
      </div>

      <Alert className="mt-4 border-red-200/80 bg-background/80 dark:border-red-900/60">
        <AlertDescription className="text-sm text-red-900 dark:text-red-200">
          Betroffen sind Prüfungsergebnisse, Käufe, Abo-Daten und persönliche Einstellungen.
        </AlertDescription>
      </Alert>

      {!isOpen ? (
        <Button variant="destructive" onClick={() => setIsOpen(true)} className="mt-4">
          Löschung starten
        </Button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-red-900 dark:text-red-200">
              Zur Bestätigung exakt eingeben:{" "}
              <span className="font-mono font-semibold">{expectedConfirmation}</span>
            </Label>
            <Input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={expectedConfirmation}
              className="font-mono"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
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
              {isDeleting ? "Wird gelöscht…" : "Endgültig löschen"}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
