"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function NewDeckForm() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Deck konnte nicht erstellt werden.")
      window.location.href = `/decks/${j.id}`
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Neu</Button>
  }

  return (
    <div className="rounded-md border p-3 flex items-center gap-2">
      <input
        className="input h-9 w-56"
        placeholder="Titel des Decks"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <input
        className="input h-9 w-72"
        placeholder="(optional) Beschreibung"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button onClick={submit} disabled={loading || !title.trim()}>
        Erstellen
      </Button>
      <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
        Abbrechen
      </Button>
    </div>
  )
}