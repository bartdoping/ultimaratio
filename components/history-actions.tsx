// components/history-actions.tsx
"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"

export function DeleteAttemptButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function onDelete() {
    if (!confirm("Diesen Versuch wirklich löschen?")) return
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) {
      alert(j?.error || "Löschen fehlgeschlagen")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <Button variant="destructive" onClick={onDelete} disabled={pending}>
      {pending ? "Lösche…" : "Löschen"}
    </Button>
  )
}

export function DeleteAllAttemptsButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function onDeleteAll() {
    if (!confirm("Alle Versuche löschen?")) return
    const res = await fetch("/api/history", { method: "DELETE" })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.ok) {
      alert(j?.error || "Löschen fehlgeschlagen")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <Button variant="destructive" onClick={onDeleteAll} disabled={pending}>
      {pending ? "Lösche…" : "Alle löschen"}
    </Button>
  )
}