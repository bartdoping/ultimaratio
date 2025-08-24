// app/(auth)/register/page.tsx
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type FormState = {
  name: string
  surname: string
  email: string
  password: string
  confirm: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    name: "",
    surname: "",
    email: "",
    password: "",
    confirm: "",
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordsFilled = form.password.length > 0 && form.confirm.length > 0
  const passwordsMatch = useMemo(
    () => form.password === form.confirm,
    [form.password, form.confirm]
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)

    if (!passwordsMatch) {
      setErr("Die Passwörter stimmen nicht überein.")
      return
    }
    if (form.password.length < 8) {
      setErr("Das Passwort muss mindestens 8 Zeichen lang sein.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({} as any))

      if (!res.ok) {
        setErr(data?.error || "Registrierung fehlgeschlagen.")
        return
      }

      setMsg("Code verschickt! Bitte E-Mail öffnen.")
      if ((data as any)?.devHint) setMsg(`${(data as any).devHint} (nur DEV)`)

      setTimeout(() => {
        router.push(`/verify?email=${encodeURIComponent(form.email)}`)
      }, 800)
    } catch {
      setErr("Netzwerkfehler. Bitte später erneut versuchen.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Registrieren</h1>

      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">Vorname</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="text"
            autoComplete="given-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Nachname</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="text"
            autoComplete="family-name"
            required
            value={form.surname}
            onChange={(e) => setForm({ ...form, surname: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <label className="text-sm font-medium">E-Mail</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Passwort</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Passwort bestätigen</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            disabled={loading}
          />
          {passwordsFilled && !passwordsMatch && (
            <p className="text-xs text-red-600 mt-1">
              Passwörter stimmen nicht überein.
            </p>
          )}
        </div>

        <button
          className="btn w-full"
          disabled={loading || (passwordsFilled && !passwordsMatch)}
        >
          {loading ? "Bitte warten…" : "Konto erstellen"}
        </button>
      </form>

      {/* CTA: Anmelden */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Bereits ein Konto vorhanden?</span>
        <Link
          href="/login"
          className="inline-flex items-center h-9 rounded-md border px-3 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Jetzt anmelden
        </Link>
      </div>
    </div>
  )
}