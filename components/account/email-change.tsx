// components/account/email-change.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react" // ← NEU

export default function EmailChangeCard({ initialEmail }: { initialEmail: string }) {
  const router = useRouter()
  const { update } = useSession() // ← NEU

  const [step, setStep] = useState<"idle"|"code-sent">("idle")
  const [email, setEmail] = useState(initialEmail)
  const [newEmail, setNewEmail] = useState("")
  const [code, setCode] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null); setBusy(true)
    try {
      const res = await fetch("/api/account/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "E-Mail konnte nicht versendet werden.")
      setMsg("Code gesendet. Bitte Posteingang prüfen.")
      setStep("code-sent")
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null); setBusy(true)
    try {
      const res = await fetch("/api/account/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, code }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Code ungültig oder abgelaufen.")

      // ✅ Hier sofort Session im Client aktualisieren:
      await update({ user: { email: newEmail } }) // ← WICHTIG
      router.refresh()                             // ← optional, aber gut

      setEmail(newEmail)
      setMsg("E-Mail aktualisiert.")
      setStep("idle")
      setNewEmail("")
      setCode("")
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded border">
      <div className="border-b px-4 py-3 font-semibold">E-Mail ändern</div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-muted-foreground">
          Aktuelle E-Mail: <span className="font-medium text-foreground">{email}</span>
        </div>

        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}

        {step === "idle" ? (
          <form onSubmit={requestCode} className="space-y-2">
            <div>
              <label className="text-sm font-medium">Neue E-Mail</label>
              <input
                className="input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn" disabled={busy}>
              {busy ? "Bitte warten…" : "Code an neue E-Mail senden"}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmCode} className="space-y-2">
            <div>
              <label className="text-sm font-medium">Bestätigungscode</label>
              <input
                className="input"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="6-stelliger Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <button className="btn" disabled={busy}>
              {busy ? "Bitte warten…" : "E-Mail ändern"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}