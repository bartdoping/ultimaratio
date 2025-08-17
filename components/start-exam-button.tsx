"use client"

import { useState } from "react"

export function StartExamButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false)

  async function start() {
    try {
      setLoading(true)
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok || !data?.attemptId) throw new Error(data?.error || "Konnte Attempt nicht erstellen.")
      window.location.href = `/exam-run/${data.attemptId}`
    } catch (e: any) {
      alert(e.message ?? "Fehler beim Starten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className="btn" onClick={start} disabled={loading}>
      {loading ? "Starte…" : "Prüfung starten"}
    </button>
  )
}
