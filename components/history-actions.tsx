"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function DeleteAttemptButton({ attemptId }: { attemptId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function del() {
    if (!confirm("Diesen Versuch wirklich löschen?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/history/${attemptId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Löschen fehlgeschlagen")
      router.refresh()
    } catch (e: any) {
      alert(e.message ?? "Fehler beim Löschen")
    } finally {
      setLoading(false)
    }
  }
  return <button className="btn" onClick={del} disabled={loading}>{loading ? "Lösche…" : "Löschen"}</button>
}

export function DeleteAllAttemptsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function delAll() {
    if (!confirm("Wirklich ALLE Versuche löschen? Dies kann nicht rückgängig gemacht werden.")) return
    setLoading(true)
    try {
      const res = await fetch("/api/history", { method: "DELETE" })
      if (!res.ok) throw new Error("Löschen fehlgeschlagen")
      router.refresh()
    } catch (e: any) {
      alert(e.message ?? "Fehler beim Löschen")
    } finally {
      setLoading(false)
    }
  }
  return <button className="btn" onClick={delAll} disabled={loading}>{loading ? "Lösche…" : "Alles löschen"}</button>
}
