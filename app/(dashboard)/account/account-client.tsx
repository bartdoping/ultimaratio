"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { DeleteAccountButton } from "@/components/account/delete-account-button"

type User = {
  id: string
  name: string
  surname: string
  email: string
  createdAt: string // ISO
}

type PurchaseUI = {
  id: string
  createdAt: string
  examTitle: string
  priceCents: number
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

  // Profil (Name)
  const [name, setName] = useState(user.name)
  const [surname, setSurname] = useState(user.surname)
  const [savingProfile, setSavingProfile] = useState(false)
  const [msgProfile, setMsgProfile] = useState<string | null>(null)
  const [errProfile, setErrProfile] = useState<string | null>(null)

  // E-Mail ändern
  const [newEmail, setNewEmail] = useState("")
  const [emailStage, setEmailStage] = useState<"idle" | "code-sent">("idle")
  const [emailCode, setEmailCode] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)
  const [msgEmail, setMsgEmail] = useState<string | null>(null)
  const [errEmail, setErrEmail] = useState<string | null>(null)

  // Passwort ändern
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPw, setSavingPw] = useState(false)
  const [msgPw, setMsgPw] = useState<string | null>(null)
  const [errPw, setErrPw] = useState<string | null>(null)

  const memberSince = useMemo(() => {
    try { return new Date(user.createdAt).toLocaleDateString() } catch { return "–" }
  }, [user.createdAt])

  async function saveProfile() {
    setMsgProfile(null); setErrProfile(null); setSavingProfile(true)
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte Profil nicht speichern.")
      setUser(u => ({ ...u, name, surname }))

      // Optional: auch die Session-Name-Eigenschaft mitziehen
      await update({ user: { name: `${name} ${surname}`.trim() } as any })
      setMsgProfile("Profil gespeichert.")
    } catch (e) {
      setErrProfile((e as Error).message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function requestEmailCode() {
    setMsgEmail(null); setErrEmail(null); setSavingEmail(true)
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
    setMsgEmail(null); setErrEmail(null); setSavingEmail(true)
    try {
      const res = await fetch("/api/account/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, code: emailCode }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Bestätigung fehlgeschlagen.")

      // ✅ Session sofort clientseitig updaten -> Header zeigt sofort neue E-Mail
      await update({ user: { email: newEmail } as any })
      router.refresh()

      setUser(u => ({ ...u, email: newEmail }))
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
    setMsgPw(null); setErrPw(null)
    if (newPassword.length < 8) { setErrPw("Neues Passwort muss min. 8 Zeichen haben."); return }
    if (newPassword !== confirmPassword) { setErrPw("Passwörter stimmen nicht überein."); return }
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
      setOldPassword(""); setNewPassword(""); setConfirmPassword("")
    } catch (e) {
      setErrPw((e as Error).message)
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Übersicht */}
      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">Übersicht</h2>
        <div className="text-sm text-muted-foreground">
          <div><span className="inline-block w-40">Vorname:</span> {user.name || "–"}</div>
          <div><span className="inline-block w-40">Nachname:</span> {user.surname || "–"}</div>
          <div><span className="inline-block w-40">E-Mail:</span> {user.email}</div>
          <div><span className="inline-block w-40">Mitglied seit:</span> {memberSince}</div>
        </div>
      </section>

      {/* Profil bearbeiten */}
      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">Profil bearbeiten</h2>
        {msgProfile && <p className="text-sm text-green-600">{msgProfile}</p>}
        {errProfile && <p className="text-sm text-red-600">{errProfile}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Vorname</label>
            <input className="input w-full" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Nachname</label>
            <input className="input w-full" value={surname} onChange={e=>setSurname(e.target.value)} />
          </div>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? "Speichern…" : "Speichern"}
        </Button>
      </section>

      {/* E-Mail ändern */}
      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">E-Mail ändern</h2>
        {msgEmail && <p className="text-sm text-green-600">{msgEmail}</p>}
        {errEmail && <p className="text-sm text-red-600">{errEmail}</p>}

        {emailStage === "idle" && (
          <div className="max-w-md space-y-2">
            <label className="text-sm font-medium">Neue E-Mail</label>
            <input
              className="input w-full"
              type="email"
              value={newEmail}
              onChange={e=>setNewEmail(e.target.value)}
              placeholder="neue-adresse@example.com"
            />
            <Button onClick={requestEmailCode} disabled={savingEmail || !newEmail}>
              Code an neue E-Mail senden
            </Button>
          </div>
        )}

        {emailStage === "code-sent" && (
          <div className="max-w-md space-y-2">
            <div className="text-sm">Wir haben einen 6-stelligen Code an <b>{newEmail}</b> gesendet.</div>
            <label className="text-sm font-medium">Bestätigungscode</label>
            <input
              className="input w-full"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g,""))}
              placeholder="123456"
            />
            <div className="flex gap-2">
              <Button onClick={confirmEmailChange} disabled={savingEmail || emailCode.length !== 6}>
                E-Mail ändern
              </Button>
              <Button variant="outline" onClick={() => { setEmailStage("idle"); setEmailCode(""); }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Passwort ändern */}
      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">Passwort ändern</h2>
        {msgPw && <p className="text-sm text-green-600">{msgPw}</p>}
        {errPw && <p className="text-sm text-red-600">{errPw}</p>}

        <div className="max-w-md space-y-3">
          <div>
            <label className="text-sm font-medium">Altes Passwort</label>
            <input className="input w-full" type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Neues Passwort</label>
            <input className="input w-full" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8} />
          </div>
          <div>
            <label className="text-sm font-medium">Neues Passwort bestätigen</label>
            <input className="input w-full" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={8} />
          </div>
          <Button onClick={changePassword} disabled={savingPw}>
            {savingPw ? "Aktualisiere…" : "Passwort aktualisieren"}
          </Button>
        </div>
      </section>

      {/* Käufe */}
      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">Erworbene Produkte</h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Käufe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr className="text-left">
                  <th className="px-3 py-2">Datum</th>
                  <th className="px-3 py-2">Produkt</th>
                  <th className="px-3 py-2">Preis</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} className="odd:bg-muted/40">
                    <td className="px-3 py-2">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{p.examTitle}</td>
                    <td className="px-3 py-2">{(p.priceCents / 100).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Account löschen */}
      <DeleteAccountButton />
    </div>
  )
}