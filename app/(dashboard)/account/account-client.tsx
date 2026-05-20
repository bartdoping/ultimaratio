"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { DeleteAccountButton } from "@/components/account/delete-account-button"

type User = {
  id: string
  name: string
  surname: string
  email: string
  createdAt: string
}

type PurchaseUI = {
  id: string
  createdAt: string
  examTitle: string
  priceCents: number
}

function Feedback({
  message,
  tone,
}: {
  message: string
  tone: "success" | "error"
}) {
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
      : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
  return <p className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{message}</p>
}

export default function AccountClient({
  user: initialUser,
  purchases,
}: {
  user: User
  purchases: PurchaseUI[]
}) {
  const router = useRouter()
  const { update } = useSession()

  const [user, setUser] = useState(initialUser)
  const [name, setName] = useState(user.name)
  const [surname, setSurname] = useState(user.surname)
  const [savingProfile, setSavingProfile] = useState(false)
  const [msgProfile, setMsgProfile] = useState<string | null>(null)
  const [errProfile, setErrProfile] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState("")
  const [emailStage, setEmailStage] = useState<"idle" | "code-sent">("idle")
  const [emailCode, setEmailCode] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)
  const [msgEmail, setMsgEmail] = useState<string | null>(null)
  const [errEmail, setErrEmail] = useState<string | null>(null)

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPw, setSavingPw] = useState(false)
  const [msgPw, setMsgPw] = useState<string | null>(null)
  const [errPw, setErrPw] = useState<string | null>(null)

  const memberSince = useMemo(() => {
    try {
      return new Date(user.createdAt).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "–"
    }
  }, [user.createdAt])

  async function saveProfile() {
    setMsgProfile(null)
    setErrProfile(null)
    setSavingProfile(true)
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte Profil nicht speichern.")
      setUser((u) => ({ ...u, name, surname }))
      await update({ user: { name: `${name} ${surname}`.trim() } as { name: string } })
      setMsgProfile("Profil gespeichert.")
    } catch (e) {
      setErrProfile((e as Error).message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function requestEmailCode() {
    setMsgEmail(null)
    setErrEmail(null)
    setSavingEmail(true)
    try {
      const res = await fetch("/api/account/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "E-Mail konnte nicht versendet werden.")
      setEmailStage("code-sent")
      setMsgEmail("Code gesendet. Bitte Posteingang prüfen.")
    } catch (e) {
      setErrEmail((e as Error).message)
    } finally {
      setSavingEmail(false)
    }
  }

  async function confirmEmailChange() {
    setMsgEmail(null)
    setErrEmail(null)
    setSavingEmail(true)
    try {
      const res = await fetch("/api/account/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, code: emailCode }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Bestätigung fehlgeschlagen.")
      await update({ user: { email: newEmail } as { email: string } })
      router.refresh()
      setUser((u) => ({ ...u, email: newEmail }))
      setMsgEmail("E-Mail aktualisiert.")
      setEmailStage("idle")
      setEmailCode("")
      setNewEmail("")
    } catch (e) {
      setErrEmail((e as Error).message)
    } finally {
      setSavingEmail(false)
    }
  }

  async function changePassword() {
    setMsgPw(null)
    setErrPw(null)
    if (newPassword.length < 8) {
      setErrPw("Neues Passwort muss mindestens 8 Zeichen haben.")
      return
    }
    if (newPassword !== confirmPassword) {
      setErrPw("Passwörter stimmen nicht überein.")
      return
    }
    setSavingPw(true)
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Passwortänderung fehlgeschlagen.")
      setMsgPw("Passwort aktualisiert.")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e) {
      setErrPw((e as Error).message)
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <>
      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Profil</h2>
          <p className="text-sm text-muted-foreground">
            Name und Anzeige. Die E-Mail-Adresse änderst du im Bereich Sicherheit.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/25 px-3 py-2.5 text-sm">
            <div className="text-xs text-muted-foreground">E-Mail</div>
            <div className="mt-0.5 font-medium break-all">{user.email}</div>
          </div>
          <div className="rounded-lg border bg-muted/25 px-3 py-2.5 text-sm">
            <div className="text-xs text-muted-foreground">Mitglied seit</div>
            <div className="mt-0.5 font-medium">{memberSince}</div>
          </div>
        </div>

        {msgProfile && <Feedback message={msgProfile} tone="success" />}
        {errProfile && <Feedback message={errProfile} tone="error" />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Vorname</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="surname">Nachname</Label>
            <Input id="surname" value={surname} onChange={(e) => setSurname(e.target.value)} />
          </div>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? "Speichern…" : "Profil speichern"}
        </Button>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Sicherheit</h2>
          <p className="text-sm text-muted-foreground">E-Mail und Passwort für deinen Login.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-muted/15 p-4 space-y-3">
            <h3 className="text-sm font-semibold">E-Mail ändern</h3>
            <p className="text-xs text-muted-foreground">
              Neue Adresse wird per Bestätigungscode verifiziert.
            </p>
            {msgEmail && <Feedback message={msgEmail} tone="success" />}
            {errEmail && <Feedback message={errEmail} tone="error" />}

            {emailStage === "idle" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Neue E-Mail</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="neue-adresse@beispiel.de"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={requestEmailCode}
                  disabled={savingEmail || !newEmail.trim()}
                >
                  Code senden
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm rounded-lg border bg-background px-3 py-2">
                  Code an <strong>{newEmail}</strong> gesendet.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="emailCode">Bestätigungscode</Label>
                  <Input
                    id="emailCode"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={confirmEmailChange}
                    disabled={savingEmail || emailCode.length !== 6}
                  >
                    E-Mail übernehmen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEmailStage("idle")
                      setEmailCode("")
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border bg-muted/15 p-4 space-y-3">
            <h3 className="text-sm font-semibold">Passwort ändern</h3>
            <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
            {msgPw && <Feedback message={msgPw} tone="success" />}
            {errPw && <Feedback message={errPw} tone="error" />}

            <div className="space-y-2">
              <Label htmlFor="oldPassword">Aktuelles Passwort</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <Button size="sm" onClick={changePassword} disabled={savingPw}>
              {savingPw ? "Aktualisiere…" : "Passwort speichern"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Einzelkäufe</h2>
            <p className="text-sm text-muted-foreground">
              Freigeschaltete Prüfungen bleiben dauerhaft in deinem Account.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/exams">Zum Katalog</Link>
          </Button>
        </div>

        {purchases.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Noch keine Einzelkäufe. Pro umfasst alle Prüfungen – Einzelkäufe findest du im Katalog.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {purchases.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{p.examTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString("de-DE")}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums">
                  {(p.priceCents / 100).toFixed(2)} €
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeleteAccountButton />
    </>
  )
}
