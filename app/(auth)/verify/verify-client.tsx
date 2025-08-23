"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"

export function VerifyClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const e = params.get("email")
    if (e) setEmail(e)
  }, [params])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setMsg(null)
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j?.error || "Code ungültig.")
      return
    }
    setMsg("E-Mail verifiziert! Du kannst dich jetzt einloggen.")
    setTimeout(() => router.push("/login"), 800)
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">E-Mail bestätigen</h1>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">E-Mail</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Code (6 Ziffern)</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value)}
            required
          />
        </div>
        <button className="btn w-full">Bestätigen</button>
      </form>
    </div>
  )
}