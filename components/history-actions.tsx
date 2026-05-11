// components/history-actions.tsx
"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"

export function DeleteAttemptButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function onDelete() {
    if (!confirm("Diesen Versuch löschen?")) return
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) {
      alert(j?.error || "Der Versuch konnte nicht gelöscht werden.")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <Button variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
      {pending ? "Lösche…" : "Löschen"}
    </Button>
  )
}

export function DeleteAllAttemptsButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function onDeleteAll() {
    if (!confirm("Alle Versuche aus der Historie löschen?")) return
    const res = await fetch("/api/history", { method: "DELETE" })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) {
      alert(j?.error || "Die Historie konnte nicht gelöscht werden.")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <Button variant="destructive" size="sm" onClick={onDeleteAll} disabled={pending}>
      {pending ? "Lösche…" : "Historie löschen"}
    </Button>
  )
}