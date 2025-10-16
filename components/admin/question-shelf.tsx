// components/admin/question-shelf.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

type Item = {
  id: string
  preview: string
  isCase: boolean
  order: number
}

const PAGE_SIZE = 100

export default function QuestionShelf({ examId }: { examId: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [page, setPage] = useState<number>(() => {
    const p = Number(sp.get("qpage") || 1)
    return Number.isFinite(p) && p > 0 ? p : 1
  })

  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  async function load() {
    setLoading(true); setErr(null)
    try {
      const res = await fetch(
        `/api/admin/exams/${encodeURIComponent(examId)}/questions?page=${page}&pageSize=${PAGE_SIZE}`,
        { cache: "no-store" }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || "load failed")
      setItems(Array.isArray(j.items) ? j.items : [])
      setTotal(Number(j.total || 0))
    } catch (e: any) {
      setErr(e.message || "Fehler beim Laden")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- Drag & Drop State ----------------
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoverPreview, setHoverPreview] = useState<string | null>(null)

  function openEditor(id: string) {
    const params = new URLSearchParams(sp.toString())
    params.set("edit", id)
    params.set("qpage", String(page))
    router.push(`/admin/exams/${encodeURIComponent(examId)}?${params.toString()}`)
  }

  // Reorder-Helper lokal (optimistisches Update)
  function locallyReorder(fromId: string, toId: string) {
    const from = items.findIndex(i => i.id === fromId)
    const to = items.findIndex(i => i.id === toId)
    if (from < 0 || to < 0 || from === to) return items
    const copy = items.slice()
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    return copy
  }

  async function sendReorder(orderedIds: string[]) {
    await fetch(`/api/admin/exams/${encodeURIComponent(examId)}/questions/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    })
  }

  // ------------- Tile Handlers -------------
  function onTileDragStart(e: React.DragEvent<HTMLButtonElement>, id: string) {
    // id ins DataTransfer legen, damit kein State-Verlust bei Re-Renders
    e.dataTransfer.setData("text/plain", id)
    e.dataTransfer.effectAllowed = "move"
    setDraggingId(id)
  }

  function onTileDragEnter(_e: React.DragEvent<HTMLButtonElement>, id: string) {
    setOverId(id)
  }

  function onTileDragOver(e: React.DragEvent<HTMLButtonElement>) {
    // Muss sein, sonst feuert onDrop nicht
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  function onTileDragLeave(_e: React.DragEvent<HTMLButtonElement>, id: string) {
    // Nur entfernen, wenn wir die aktuelle Zelle verlassen
    if (overId === id) setOverId(null)
  }

  async function onTileDrop(e: React.DragEvent<HTMLButtonElement>, targetId: string) {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData("text/plain") || draggingId
    setOverId(null)
    setDraggingId(null)
    if (!sourceId || sourceId === targetId) return

    // Optimistisches UI
    const next = locallyReorder(sourceId, targetId)
    setItems(next)
    // Server informieren
    await sendReorder(next.map(i => i.id))
  }

  function onDragEnd() {
    setDraggingId(null)
    setOverId(null)
  }

  // Hover-Handler für Vorschau
  function onTileMouseEnter(id: string) {
    setHoveredId(id)
    const item = items.find(i => i.id === id)
    if (item) {
      setHoverPreview(item.preview)
    }
  }

  function onTileMouseLeave() {
    setHoveredId(null)
    setHoverPreview(null)
  }

  // Fallback: Container-Events erlauben Drop generell
  function onGridDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  return (
    <div className="space-y-3">
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="rounded border p-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Lade…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Noch keine Fragen erstellt.</div>
        ) : (
          <div
            className="grid grid-cols-10 gap-2"
            onDragOver={onGridDragOver}
          >
            {items.map((it, i) => {
              const isDragging = draggingId === it.id
              const isOver = overId === it.id && draggingId !== it.id
              const isHovered = hoveredId === it.id
              return (
                <button
                  key={it.id}
                  title={it.preview || "Frage"}
                  draggable
                  aria-grabbed={isDragging}
                  onDragStart={(e) => onTileDragStart(e, it.id)}
                  onDragEnter={(e) => onTileDragEnter(e, it.id)}
                  onDragOver={onTileDragOver}
                  onDragLeave={(e) => onTileDragLeave(e, it.id)}
                  onDrop={(e) => onTileDrop(e, it.id)}
                  onDragEnd={onDragEnd}
                  onMouseEnter={() => onTileMouseEnter(it.id)}
                  onMouseLeave={onTileMouseLeave}
                  onClick={() => openEditor(it.id)}
                  className={[
                    "h-9 rounded border text-xs font-medium transition-all duration-200",
                    "flex items-center justify-center select-none cursor-move",
                    it.isCase
                      ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
                      : "bg-muted/40 hover:bg-muted/70",
                    isDragging ? "opacity-50 scale-95 shadow-lg transform rotate-2"
                      : isOver ? "ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/30 scale-105"
                      : isHovered ? "ring-1 ring-gray-400 bg-gray-100 dark:bg-gray-800 scale-105"
                      : "hover:scale-105 hover:shadow-md",
                  ].join(" ")}
                >
                  {((page - 1) * PAGE_SIZE) + i + 1}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Hover-Vorschau */}
      {hoverPreview && (
        <div className="fixed top-4 right-4 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vorschau:</div>
          <div className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">
            {hoverPreview}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >‹ Zurück</Button>
          <div className="text-sm text-muted-foreground">
            Seite {page} / {totalPages} · {total} Fragen
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >Weiter ›</Button>
        </div>
      )}
    </div>
  )
}