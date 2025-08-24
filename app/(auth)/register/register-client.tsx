// app/(auth)/register/register-client.tsx
"use client"

import { useState } from "react"

type Msg = { type: "ok" | "error"; text: string }

export function RegisterClient() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    // Client-Side Check
    if (password !== confirm) {
      setMsg({ type: "error", text: "Die Passwörter stimmen nicht überein." })
      return
    }

    setPending(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, surname, password, confirm }),
      })

      const j = await res.json().catch(() => ({} as any))

      if (!res.ok) {
        setMsg({ type: "error", text: j?.error ?? "Registrierung fehlgeschlagen." })
        return
      }

      setMsg({
        type: "ok",
        text: "Registrierung erfolgreich! Prüfe deine E-Mail für den Bestätigungscode.",
      })
      // Optional: Felder leeren
      // setPassword(""); setConfirm("");
    } catch (err) {
      setMsg({ type: "error", text: "Netzwerkfehler. Bitte später erneut versuchen." })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Konto erstellen</h1>

      {msg && (
        <p className={msg.type === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
          {msg.text}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">E-Mail</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Vorname</label>
            <input
              className="w-full h-10 rounded-md border px-3"
              type="text"
              autoComplete="given-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nachname</label>
            <input
              className="w-full h-10 rounded-md border px-3"
              type="text"
              autoComplete="family-name"
              required
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Passwort</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Passwort bestätigen</label>
          <input
            className="w-full h-10 rounded-md border px-3"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={pending}
          />
          {/* kleine Inline-Fehlermeldung, wenn gewünscht:
              {confirm && confirm !== password && (
                <p className="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein.</p>
              )}
          */}
        </div>

        <button className="btn w-full" disabled={pending}>
          {pending ? "Sende…" : "Registrieren"}
        </button>
      </form>
    </div>
  )
}