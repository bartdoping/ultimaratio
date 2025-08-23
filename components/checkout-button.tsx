// components/checkout-button.tsx
"use client"

import { useState } from "react"

type Props = { slug?: string; examId?: string }

export function CheckoutButton({ slug, examId }: Props) {
  const [busy, setBusy] = useState(false)

  async function onClick() {
    setBusy(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, examId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || "Fehler beim Starten des Checkouts.")
        return
      }
      if (data.alreadyOwned) {
        // schon gekauft → zurück zur Exam-Seite
        const target = slug ? `/exams/${slug}` : "/exams"
        window.location.href = target
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        alert("Unerwartete Antwort vom Server.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="btn w-full" onClick={onClick} disabled={busy}>
      {busy ? "Weiterleiten…" : "Jetzt freischalten"}
    </button>
  )
}