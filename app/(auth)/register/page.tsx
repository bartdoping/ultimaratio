// app/(auth)/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", surname: "", email: "", password: "", confirm: "" })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null); setMsg(null)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setErr(data?.error || "Registrierung fehlgeschlagen."); return }
    setMsg("Code verschickt! Bitte E-Mail öffnen.")
    if (data?.devHint) setMsg(`${data.devHint} (nur DEV)`)
    setTimeout(() => router.push(`/verify?email=${encodeURIComponent(form.email)}`), 800)
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Registrieren</h1>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        {["name","surname","email","password","confirm"].map((k) => (
          <div key={k}>
            <label className="text-sm font-medium">{k}</label>
            <input
              className="w-full h-10 rounded-md border px-3"
              type={k.includes("password") ? "password" : (k==="email"?"email":"text")}
              value={(form as any)[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              required
            />
          </div>
        ))}
        <button className="btn w-full" disabled={loading}>{loading ? "Bitte warten…" : "Konto erstellen"}</button>
      </form>
    </div>
  )
}
