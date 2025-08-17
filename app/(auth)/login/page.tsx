// app/(auth)/login/page.tsx
"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const params = useSearchParams()
  const router = useRouter()
  const next = params.get("next") || "/dashboard"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (!res || res.error) { setErr("Login fehlgeschlagen. Prüfe E-Mail, Passwort und Verifizierung."); return }
    router.push(next)
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">E-Mail</label>
          <input className="w-full h-10 rounded-md border px-3" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Passwort</label>
          <input className="w-full h-10 rounded-md border px-3" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        <button className="btn w-full" disabled={loading}>{loading ? "Bitte warten…" : "Einloggen"}</button>
      </form>
    </div>
  )
}
