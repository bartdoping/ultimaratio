"use client"

import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      // Absichtlich generische Meldung
      setMsg("Wenn ein Konto existiert, wurde eine E-Mail mit Anweisungen gesendet.")
    } catch {
      setMsg("Wenn ein Konto existiert, wurde eine E-Mail mit Anweisungen gesendet.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Passwort zurücksetzen</h1>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">E-Mail</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="email" value={email} onChange={e=>setEmail(e.target.value)} required
          />
        </div>
        <button disabled={busy} className="btn w-full">
          {busy ? "Bitte warten…" : "Link anfordern"}
        </button>
      </form>
    </div>
  )
}