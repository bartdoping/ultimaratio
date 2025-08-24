// app/(auth)/reset/reset-client.tsx
"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ResetClient() {
  const sp = useSearchParams()
  const router = useRouter()

  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = sp.get("token")
    if (t) setToken(t)
  }, [sp])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null)

    if (!token) { setErr("Ungültiger oder fehlender Token."); return }
    if (password.length < 8) { setErr("Passwort muss mindestens 8 Zeichen haben."); return }
    if (password !== confirm) { setErr("Passwörter stimmen nicht überein."); return }

    setBusy(true)
    try {
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Ungültiger oder abgelaufener Link.")

      setMsg("Passwort aktualisiert. Du kannst dich jetzt einloggen.")
      setTimeout(() => router.push("/login"), 1000)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Neues Passwort setzen</h1>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <form onSubmit={onSubmit} className="space-y-3">
        {!token && (
          <div>
            <label className="text-sm font-medium">Token</label>
            <input
              className="w-full h-10 rounded-md border px-3"
              value={token}
              onChange={e => setToken(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Öffne den Link aus der E-Mail – der Token wird sonst nicht automatisch übernommen.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Neues Passwort</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Passwort bestätigen</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <button className="btn w-full" disabled={busy}>
          {busy ? "Bitte warten…" : "Speichern"}
        </button>
      </form>
    </div>
  )
}