// components/admin/question-shelf.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, X, Check, Copy } from "lucide-react"

type Item = {
  id: string
  preview: string
  isCase: boolean
  order: number
  hasTags: boolean
}

const PAGE_SIZE = 100

export default function QuestionShelf({ examId }: { examId: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [page, setPage] = useState<number>(() => {
    const p = Number(sp.get("qpage") || 1)
    return Number.isFinite(p) && p > 0 ? p : 1
  })
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(sp.get("edit"))

  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  
  // Löschfunktionalität
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  
  // Duplikat-Erkennung
  const [duplicates, setDuplicates] = useState<Map<string, string[]>>(new Map())
  const [duplicatesLoaded, setDuplicatesLoaded] = useState(false)

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

  // Lade Duplikate
  const loadDuplicates = async () => {
    if (duplicatesLoaded) return
    
    try {
      const res = await fetch(`/api/admin/exams/${examId}/duplicates`, { cache: "no-store" })
      const data = await res.json()
      if (res.ok && data.duplicates) {
        const duplicatesMap = new Map<string, string[]>()
        Object.entries(data.duplicates).forEach(([hash, questionIds]) => {
          duplicatesMap.set(hash, questionIds as string[])
        })
        setDuplicates(duplicatesMap)
        setDuplicatesLoaded(true)
      }
    } catch (error) {
      console.error("Error loading duplicates:", error)
    }
  }

  useEffect(() => {
    loadDuplicates()
  }, [examId, duplicatesLoaded])
  
  // Aktualisiere currentQuestionId wenn sich die URL ändert
  useEffect(() => {
    const editParam = sp.get("edit")
    setCurrentQuestionId(editParam)
  }, [sp])

  // Löschfunktionen
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const selectAllQuestions = () => {
    setSelectedQuestions(new Set(items.map(item => item.id)))
  }

  const clearSelection = () => {
    setSelectedQuestions(new Set())
  }

  const handleDeleteQuestions = async () => {
    if (selectedQuestions.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/questions/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: Array.from(selectedQuestions) })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Löschen fehlgeschlagen')
      }

      // Erfolgreich gelöscht - Seite neu laden
      setSelectedQuestions(new Set())
      setDeleteMode(false)
      setShowDeleteConfirm(false)
      await load()
    } catch (error: any) {
      setErr(error.message || 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  const handleSingleDelete = (questionId: string) => {
    setSelectedQuestions(new Set([questionId]))
    setShowDeleteConfirm(true)
  }

  // Prüfe ob eine Frage ein Duplikat ist
  const isDuplicate = (questionId: string) => {
    for (const questionIds of duplicates.values()) {
      if (questionIds.includes(questionId) && questionIds.length > 1) {
        return true
      }
    }
    return false
  }

  // Zähle Duplikate für eine Frage
  const getDuplicateCount = (questionId: string) => {
    for (const questionIds of duplicates.values()) {
      if (questionIds.includes(questionId)) {
        return questionIds.length
      }
    }
    return 0
  }

  // ---------------- Drag & Drop State ----------------
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoverPreview, setHoverPreview] = useState<string | null>(null)

  function openEditor(id: string) {
    const params = new URLSearchParams(sp.toString())
    params.set("edit", id)
    params.set("qpage", String(page))
    setCurrentQuestionId(id)
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
    
    // Erstelle ein Drag-Image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.transform = "rotate(5deg) scale(1.1)"
    dragImage.style.opacity = "0.8"
    dragImage.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)"
    dragImage.style.border = "2px solid #3b82f6"
    dragImage.style.borderRadius = "8px"
    dragImage.style.backgroundColor = "#dbeafe"
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    dragImage.style.left = "-1000px"
    dragImage.style.zIndex = "9999"
    
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    
    // Cleanup nach kurzer Zeit
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 100)
    
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
              const isCurrent = currentQuestionId === it.id
              const isUntagged = !it.hasTags
              return (
                <div key={it.id} className="relative group">
                  <button
                    title={it.preview || "Frage"}
                    draggable={!deleteMode}
                    aria-grabbed={isDragging}
                    onDragStart={(e) => !deleteMode && onTileDragStart(e, it.id)}
                    onDragEnter={(e) => !deleteMode && onTileDragEnter(e, it.id)}
                    onDragOver={!deleteMode ? onTileDragOver : undefined}
                    onDragLeave={(e) => !deleteMode && onTileDragLeave(e, it.id)}
                    onDrop={(e) => !deleteMode && onTileDrop(e, it.id)}
                    onDragEnd={!deleteMode ? onDragEnd : undefined}
                    onMouseEnter={() => onTileMouseEnter(it.id)}
                    onMouseLeave={onTileMouseLeave}
                    onClick={() => {
                      if (deleteMode) {
                        toggleQuestionSelection(it.id)
                      } else {
                        openEditor(it.id)
                      }
                    }}
                    className={[
                      "h-9 rounded border text-xs font-medium transition-all duration-200",
                      "flex items-center justify-center select-none relative",
                      deleteMode ? "cursor-pointer" : "cursor-move",
                      // Base colors
                      it.isCase
                        ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
                        : "bg-muted/40 hover:bg-muted/70",
                      // Current question (yellow highlight)
                      isCurrent ? "ring-2 ring-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400" : "",
                      // Untagged questions (red highlight)
                      isUntagged && !isCurrent ? "ring-1 ring-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700 dark:text-red-300" : "",
                      // Selected questions (green highlight)
                      selectedQuestions.has(it.id) ? "ring-2 ring-green-500 bg-green-100 dark:bg-green-900/30 border-green-500" : "",
                      // Duplicate questions (purple highlight)
                      isDuplicate(it.id) ? "ring-1 ring-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-300" : "",
                      // Drag states - BEHOBEN: Entferne scale-105 und andere Verzerrungen
                      isDragging ? "opacity-50 shadow-lg"
                        : isOver ? "ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/30"
                        : isHovered ? "ring-1 ring-gray-400 bg-gray-100 dark:bg-gray-800"
                        : "hover:shadow-md",
                    ].join(" ")}
                  >
                    {((page - 1) * PAGE_SIZE) + i + 1}
                    {/* Tag indicator */}
                    {isUntagged && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-gray-800"></div>
                    )}
                    {/* Duplicate indicator */}
                    {isDuplicate(it.id) && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
                        <Copy className="h-2 w-2 text-white" />
                      </div>
                    )}
                    {/* Selection indicator */}
                    {selectedQuestions.has(it.id) && (
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
                        <Check className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </button>
                  
                  {/* Einzelne Löschen Button */}
                  {!deleteMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSingleDelete(it.id)
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Frage löschen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Verbesserte Hover-Vorschau */}
      {hoverPreview && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-full mx-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Fragenvorschau</div>
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
            {hoverPreview}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Klicken zum Bearbeiten
          </div>
        </div>
      )}

      {/* Löschfunktionalität */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={deleteMode ? "destructive" : "outline"}
            onClick={() => {
              setDeleteMode(!deleteMode)
              if (deleteMode) {
                clearSelection()
              }
            }}
          >
            {deleteMode ? "Löschmodus beenden" : "Löschmodus"}
          </Button>
          
          {deleteMode && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllQuestions}
                disabled={selectedQuestions.size === items.length}
              >
                Alle auswählen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                disabled={selectedQuestions.size === 0}
              >
                Auswahl aufheben
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={selectedQuestions.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Löschen ({selectedQuestions.size})
              </Button>
            </>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {deleteMode && selectedQuestions.size > 0 && (
            <span className="text-orange-600">
              {selectedQuestions.size} ausgewählt
            </span>
          )}
          {duplicatesLoaded && duplicates.size > 0 && (
            <span className="text-purple-600 ml-2">
              {duplicates.size} Duplikat-Gruppen gefunden
            </span>
          )}
        </div>
      </div>

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

      {/* Bestätigungsdialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Fragen löschen
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Diese Aktion kann nicht rückgängig gemacht werden
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Folgende {selectedQuestions.size} Frage{selectedQuestions.size > 1 ? 'n' : ''} werden gelöscht:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {Array.from(selectedQuestions).map(questionId => {
                  const question = items.find(item => item.id === questionId)
                  return (
                    <div key={questionId} className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Frage {items.findIndex(item => item.id === questionId) + 1}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                        {question?.preview?.slice(0, 100) || 'Keine Vorschau verfügbar'}...
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteQuestions}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Lösche...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}