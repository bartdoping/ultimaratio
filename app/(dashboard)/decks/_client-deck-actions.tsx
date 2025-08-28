"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type Props = { deckId: string }

export default function DeckActions({ deckId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (loading) return
    if (!confirm("Dieses Deck wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: "DELETE" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Löschen fehlgeschlagen.")
      // Nach dem Löschen die Liste aktualisieren
      if (typeof window !== "undefined") window.location.reload()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/practice/deck/${deckId}`}>
        <Button>Üben</Button>
      </Link>
      <Link href={`/decks/${deckId}`}>
        <Button variant="outline">Bearbeiten</Button>
      </Link>
      <Button variant="destructive" onClick={handleDelete} disabled={loading}>
        {loading ? "Löschen…" : "Löschen"}
      </Button>
    </div>
  )
}