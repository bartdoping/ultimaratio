"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

export function LoginClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)

    const callbackUrl = params.get("callbackUrl") || "/dashboard"
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,          // ✨ wichtig, damit wir selbst navigieren
      callbackUrl,
    })

    setBusy(false)

    if (res?.error) {
      setErr("Login fehlgeschlagen. Prüfe E-Mail, Passwort und Verifizierung.")
      return
    }
    // Erfolg: weiterleiten
    router.replace(callbackUrl)
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">E-Mail</label>
        <input
          className="w-full h-10 rounded-md border px-3"
          type="email" value={email} onChange={e=>setEmail(e.target.value)} required
        />
        </div>
        <div>
          <label className="text-sm font-medium">Passwort</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="password" value={password} onChange={e=>setPassword(e.target.value)} required
          />
        </div>
        <button disabled={busy} className="btn w-full">{busy ? "Bitte warten…" : "Einloggen"}</button>
      </form>

      <p className="text-sm text-muted-foreground">
        Passwort vergessen?{" "}
        <a className="underline" href="/forgot-password">Zurücksetzen</a>
      </p>
    </div>
  )
}