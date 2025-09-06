// app/(dashboard)/decks/[deckId]/_client-editor.tsx
"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import BulkAddSection from "@/components/decks/bulk-add-section"

type Tag = { id?: string; slug: string; name: string; parentId?: string | null }

type DeckItemRow = {
  questionId: string
  order: number
  stem: string
  caseTitle: string | null
  examTitle: string
  tags: { slug: string; name: string }[]
}

type SearchHit = {
  questionId: string
  stem: string
  examTitle: string
  caseId: string | null
  caseTitle: string | null
  caseQuestionCount: number
  tags: { slug: string; name: string }[]
  matchIn: ("stem" | "case_title" | "case_vignette" | "option")[]
  excerpts?: Record<string, string | null>
}

export default function DeckEditorClient(props: {
  deckId: string
  initialTitle: string
  initialDescription: string
  initialItems: DeckItemRow[]
  availableTags: Tag[]
}) {
  const { deckId, initialTitle, initialDescription, initialItems, availableTags } = props
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [items, setItems] = useState<DeckItemRow[]>(initialItems)
  const [saving, setSaving] = useState(false)

  // Suche
  const [q, setQ] = useState("")
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([])
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)

  const selectedSet = useMemo(() => new Set(items.map(i => i.questionId)), [items])

  const handleBulkAddSuccess = (added: number, total: number, alreadyExists: number) => {
    // Nach erfolgreichem Bulk-Add die Seite neu laden um die neuen Items zu zeigen
    window.location.reload()
  }

  async function saveMeta() {
    setSaving(true)
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte Deck nicht speichern.")
      alert("Gespeichert.")
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function runSearch() {
    setSearching(true)
    try {
      const res = await fetch(`/api/decks/search-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: q.trim() || null, tags: selectedTagSlugs }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Suche fehlgeschlagen.")

      const arr = (j?.items || []) as any[]
      const norm: SearchHit[] = arr.map((x: any) => ({
        questionId: String(x.id),
        stem: String(x.stem || ""),
        examTitle: String(x.examTitle || ""),
        caseId: x.caseId ?? null,
        caseTitle: x.caseTitle ?? null,
        caseQuestionCount: Number(x.caseQuestionCount || 0),
        tags: (x.tags || []).map((t: any) => ({ slug: t.slug, name: t.name })),
        matchIn: Array.isArray(x.matchIn) ? x.matchIn : [],
        excerpts: x.excerpts || {},
      }))
      setResults(norm)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  async function addQuestion(qid: string) {
    try {
      const res = await fetch(`/api/decks/${deckId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qid }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte Frage nicht hinzufügen.")
      const r = results.find(r => r.questionId === qid)
      if (r) {
        setItems(prev => [...prev, {
          questionId: r.questionId,
          order: prev.length,
          stem: r.stem,
          caseTitle: r.caseTitle,
          examTitle: r.examTitle,
          tags: r.tags,
        }])
      }
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function addCase(caseId: string) {
    try {
      const res = await fetch(`/api/decks/${deckId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte Fall nicht hinzufügen.")

      // Nach dem Hinzufügen: UI minimal aktualisieren – in einer echten App
      // könnte man neu laden. Hier genügt ein Hinweis.
      alert(j.added > 0 ? `Fall hinzugefügt (${j.added} Fragen).` : "Fall war bereits vollständig im Deck.")
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function removeQuestion(qid: string) {
    if (!confirm("Frage aus Deck entfernen?")) return
    try {
      const res = await fetch(`/api/decks/${deckId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qid }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte Frage nicht entfernen.")
      setItems(prev => prev.filter(i => i.questionId !== qid).map((i, idx) => ({ ...i, order: idx })))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  function toggleTag(slug: string) {
    setSelectedTagSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  return (
    <div className="space-y-8">
      {/* Meta */}
      <section className="rounded border p-4 space-y-3">
        <div className="text-sm text-muted-foreground">Deck</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="input h-9 w-64" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input h-9 w-[32rem]" placeholder="Beschreibung (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={saveMeta} disabled={saving || !title.trim()}>
            Speichern
          </Button>
        </div>
      </section>

      {/* Suche */}
      <section className="rounded border p-4 space-y-3">
        <div className="text-sm text-muted-foreground">Fragen/Fälle suchen & hinzufügen</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input h-9 w-80"
            placeholder="Suchbegriff – matcht Frage, Fall (Titel/Vignette) & Antwortoptionen"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <Button variant="outline" onClick={runSearch} disabled={searching}>Suchen</Button>
        </div>

        {/* Tag-Auswahl (Mehrfach, AND-Logik) */}
        {availableTags.length > 0 && (
          <div className="pt-2">
            <div className="text-xs mb-1 text-muted-foreground">Tags (AND-Filter):</div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(t => (
                <button
                  key={t.slug}
                  onClick={() => toggleTag(t.slug)}
                  className={`h-8 rounded-full border px-3 text-sm ${selectedTagSlugs.includes(t.slug) ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}
                  title={t.slug}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Treffer */}
        <div className="mt-3">
          {results.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Treffer (noch).</div>
          ) : (
            <div className="space-y-2">
              {results.map(r => {
                const already = selectedSet.has(r.questionId)
                const showsCaseAdd = !!r.caseId && r.caseQuestionCount > 0 && (r.matchIn.includes("case_title") || r.matchIn.includes("case_vignette"))

                return (
                  <div key={r.questionId} className="rounded border p-3">
                    <div className="text-sm">
                      <span className="font-medium">{r.stem}</span>
                      <span className="ml-2 text-muted-foreground">
                        ({r.examTitle}{r.caseTitle ? ` · ${r.caseTitle}` : ""})
                      </span>
                    </div>

                    {/* Match-Labels + Excerpts */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {r.matchIn.includes("stem") && (
                        <span className="rounded bg-green-100 dark:bg-green-900/30 px-2 py-0.5">
                          Treffer: Frage{r.excerpts?.stem ? ` — ${r.excerpts.stem}` : ""}
                        </span>
                      )}
                      {r.matchIn.includes("case_title") && (
                        <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5">
                          Treffer: Falltitel{r.excerpts?.case_title ? ` — ${r.excerpts.case_title}` : ""}
                        </span>
                      )}
                      {r.matchIn.includes("case_vignette") && (
                        <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5">
                          Treffer: Fallvignette{r.excerpts?.case_vignette ? ` — ${r.excerpts.case_vignette}` : ""}
                        </span>
                      )}
                      {r.matchIn.includes("option") && !r.matchIn.includes("stem") && !r.matchIn.includes("case_title") && !r.matchIn.includes("case_vignette") && (
                        <span className="rounded bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5">
                          Treffer in Antwortoption{r.excerpts?.option ? ` — ${r.excerpts.option}` : ""}
                        </span>
                      )}
                    </div>

                    {r.tags.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Tags: {r.tags.map(t => t.name).join(", ")}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button onClick={() => addQuestion(r.questionId)} disabled={already}>
                        {already ? "Schon im Deck" : "Hinzufügen"}
                      </Button>
                      {showsCaseAdd && r.caseId && (
                        <Button variant="outline" onClick={() => addCase(r.caseId!)}>
                          Gesamten Fall hinzufügen ({r.caseQuestionCount})
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Deck-Inhalt */}
      <section className="rounded border p-4">
        <div className="mb-3 text-sm text-muted-foreground">Fragen im Deck</div>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Noch keine Fragen im Deck.</div>
        ) : (
          <div className="space-y-2">
            {items.map(i => (
              <div key={i.questionId} className="rounded border p-3 flex items-start justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">{i.stem}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.examTitle}{i.caseTitle ? ` · ${i.caseTitle}` : ""}
                  </div>
                </div>
                <div>
                  <Button variant="outline" onClick={() => removeQuestion(i.questionId)}>Entfernen</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bulk-Add Sektion */}
      <BulkAddSection
        deckId={deckId}
        onItemsAdded={handleBulkAddSuccess}
        className="mt-6"
      />
    </div>
  )
}