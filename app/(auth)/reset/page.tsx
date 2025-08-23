"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ResetPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = params.get("token")
    if (t) setToken(t)
  }, [params])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null); setErr(null)
    const res = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    setBusy(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j?.error || "Ungültiger oder abgelaufener Link.")
      return
    }
    setMsg("Passwort aktualisiert. Du kannst dich jetzt einloggen.")
    setTimeout(() => router.push("/login"), 800)
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Neues Passwort setzen</h1>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        {!params.get("token") && (
          <div>
            <label className="text-sm font-medium">Token</label>
            <input className="w-full h-10 rounded-md border px-3" value={token} onChange={e=>setToken(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="text-sm font-medium">Neues Passwort</label>
          <input className="w-full h-10 rounded-md border px-3" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <button disabled={busy} className="btn w-full">{busy ? "Bitte warten…" : "Speichern"}</button>
      </form>
    </div>
  )
}