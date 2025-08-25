"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type Question = {
  id: string
  stem: string
  tip?: string | null
  options: { id: string; text: string; isCorrect: boolean }[]
  media?: { id: string; url: string; alt: string; order: number }[]
  // Case (optional)
  caseId?: string | null
  caseTitle?: string | null
  caseVignette?: string | null
  caseOrder?: number | null
}

type LabValue = {
  id: string
  name: string
  unit: string
  refRange: string
  category: string
}

type Props = {
  attemptId: string
  examId: string
  passPercent: number
  allowImmediateFeedback: boolean
  questions: Question[]
  initialAnswers: Record<string, string | undefined>
}

// ↑ Zeitformat
function formatUp(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function RunnerClient(props: Props) {
  const { attemptId, allowImmediateFeedback, questions, initialAnswers } = props
  const router = useRouter()

  // Index/Antworten
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>(initialAnswers)
  const [submitting, setSubmitting] = useState(false)

  // Timer (hochzählend, pausierbar)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  // Prüfungsmodus (direktes Feedback an/aus)
  const [examMode, setExamMode] = useState(true)
  const showFeedback = allowImmediateFeedback && !examMode

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  // Laborwerte
  const [labOpen, setLabOpen] = useState(false)
  const [labLoading, setLabLoading] = useState(false)
  const [labError, setLabError] = useState<string | null>(null)
  const [labValues, setLabValues] = useState<LabValue[]>([])
  const [labQuery, setLabQuery] = useState("")

  // Oberarztkommentar
  const [tipOpen, setTipOpen] = useState(false)

  // Seitenleiste (Fragenübersicht)
  const [navOpen, setNavOpen] = useState(false)

  // Aktuelle Frage
  const q = questions[idx]
  const given = answers[q.id]
  const media = (q.media ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const hasTip = !!(q.tip && q.tip.trim().length)

  // Anzeige eines Fallkopfs dann, wenn es der erste Frage-Index
  // des aktuellen Falls ist (oder wenn eine Frage überhaupt einen Fall hat und
  // die vorherige Frage einem anderen Fall angehörte)
  const showCaseHeader = useMemo(() => {
    const curCase = q.caseId ?? null
    if (!curCase) return false
    // erste Frage insgesamt → Header zeigen
    if (idx === 0) return true
    // vorherige Frage gehörte zu einem anderen Fall oder keinem Fall → Header zeigen
    const prevCase = questions[idx - 1]?.caseId ?? null
    return prevCase !== curCase
  }, [q.caseId, idx, questions])

  // Gruppen (optional): für Seitenleiste anzeigen
  const groups = useMemo(() => {
    // Map: caseId|null => { label, startIdxs[] }
    // Wir brauchen nur Label & eine Liste der Indizes
    const res: {
      id: string | null
      label: string
      indices: number[]
      order: number
    }[] = []

    const byId = new Map<string | null, number>()
    questions.forEach((qu, i) => {
      const key = qu.caseId ?? null
      if (!byId.has(key)) {
        const order = qu.caseOrder ?? 0
        const label = key
          ? (qu.caseTitle || "Fall")
          : "Einzelfragen"
        byId.set(key, res.length)
        res.push({ id: key, label, indices: [i], order })
      } else {
        res[byId.get(key)!].indices.push(i)
      }
    })

    // Fälle nach order sortieren; „Einzelfragen“ (null) zuletzt
    return res.sort((a, b) => {
      if (a.id === null && b.id !== null) return 1
      if (a.id !== null && b.id === null) return -1
      return a.order - b.order
    })
  }, [questions])

  // Tipp beim Fragenwechsel schließen
  useEffect(() => { setTipOpen(false) }, [idx])

  async function choose(optionId: string) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answerOptionId: optionId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Antwort konnte nicht gespeichert werden.")
      setAnswers(a => ({ ...a, [q.id]: optionId }))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function finish() {
    if (!confirm("Prüfung wirklich beenden und auswerten?")) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}/finish`, { method: "POST" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte nicht auswerten.")
      router.push(`/dashboard/history/${attemptId}`)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const progress = useMemo(() => {
    const answered = Object.values(answers).filter(Boolean).length
    return `${answered}/${questions.length}`
  }, [answers, questions.length])

  // Shortcuts
  function openLightbox(i: number) { setLightboxIndex(i); setLightboxOpen(true) }
  function closeLightbox() {
    setLightboxOpen(false)
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }
  function nextImage() { if (media.length) setLightboxIndex(i => (i + 1) % media.length) }
  function prevImage() { if (media.length) setLightboxIndex(i => (i - 1 + media.length) % media.length) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Lightbox
      if (lightboxOpen) {
        if (e.key === "Escape") closeLightbox()
        if (e.key === "ArrowRight") nextImage()
        if (e.key === "ArrowLeft") prevImage()
        return
      }
      // Laborwerte
      if (e.key.toLowerCase() === "l") { e.preventDefault(); setLabOpen(true) }
      if (labOpen && e.key === "Escape") setLabOpen(false)
      // Timer
      if (e.key.toLowerCase() === "p") { e.preventDefault(); setRunning(r => !r) }
      // Seitenleiste
      if (e.key.toLowerCase() === "f") { e.preventDefault(); setNavOpen(v => !v) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxOpen, labOpen])

  useEffect(() => {
    if (lightboxOpen) overlayRef.current?.requestFullscreen?.().catch(() => {})
  }, [lightboxOpen])

  // Laborwerte lazy laden
  useEffect(() => {
    if (!labOpen || labValues.length > 0 || labLoading) return
    ;(async () => {
      setLabLoading(true); setLabError(null)
      try {
        const res = await fetch("/api/labs")
        const raw = await res.json().catch(() => null)
        const arr = (Array.isArray(raw) ? raw : (raw?.items || raw?.labs || raw?.data || [])) as any[]
        const norm: LabValue[] = (arr || []).map((x) => ({
          id: String(x.id ?? `${x.name}-${x.unit}`),
          name: String(x.name ?? ""),
          unit: String(x.unit ?? ""),
          refRange: String(x.refRange ?? x.ref_range ?? ""),
          category: String(x.category ?? ""),
        }))
        setLabValues(norm)
      } catch {
        setLabError("Laborwerte konnten nicht geladen werden.")
      } finally {
        setLabLoading(false)
      }
    })()
  }, [labOpen, labValues.length, labLoading])

  const filteredLabs = useMemo(() => {
    const t = labQuery.trim().toLowerCase()
    if (!t) return labValues
    return labValues.filter(lv =>
      [lv.name, lv.unit, lv.refRange, lv.category].filter(Boolean).some(s => s.toLowerCase().includes(t))
    )
  }, [labValues, labQuery])

  // -------- UI --------
  return (
    <div className="relative">
      {/* Toggle für Seitenleiste (mobil/klein) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setNavOpen(true)} title="Fragenübersicht (F)">
            Fragenübersicht
          </Button>
          <span>Frage {idx + 1} / {questions.length} ({progress})</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={examMode}
              onChange={(e) => { /* Sofort-Feedback im Prüfungsmodus verbergen */ setExamMode(e.target.checked) }}
            />
            Prüfungsmodus
          </label>

          <Button variant="outline" onClick={() => setLabOpen(true)} title="Laborwerte (L)">
            Laborwerte
          </Button>

          <div className="flex items-center gap-2">
            <span>Zeit: {formatUp(elapsed)}</span>
            <Button variant="outline" onClick={() => setRunning(r => !r)} title="Timer pausieren/fortsetzen (P)">
              {running ? "Pause" : "Weiter"}
            </Button>
          </div>
        </div>
      </div>

      {/* Kartenbereich */}
      <div className="card card-body space-y-4">
        {/* Fallkopf (optional) */}
        {showCaseHeader && (
          <div className="rounded border bg-secondary/40 p-4 space-y-1">
            <div className="font-semibold">{q.caseTitle || "Fall"}</div>
            {q.caseVignette && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {q.caseVignette}
              </div>
            )}
          </div>
        )}

        {/* Frage */}
        <p className="font-medium">{q.stem}</p>

        {/* Oberarztkommentar */}
        {hasTip && (
          <div className="rounded border bg-secondary/40">
            <button
              type="button"
              onClick={() => setTipOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
              aria-expanded={tipOpen}
              aria-controls="tip-content"
            >
              <span>Oberarztkommentar</span>
              <svg className={`h-4 w-4 transition-transform ${tipOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </button>
            {tipOpen && (
              <div id="tip-content" className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {q.tip}
              </div>
            )}
          </div>
        )}

        {/* Medien */}
        {media.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openLightbox(i)}
                className="group relative rounded border overflow-hidden focus:outline-none focus:ring focus:ring-blue-500 cursor-zoom-in"
                title={m.alt || "Bild vergrößern"}
                aria-label="Bild vergrößern"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt || ""}
                  className="h-28 w-40 object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                <svg
                  className="pointer-events-none absolute right-2 top-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white drop-shadow"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23A6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Optionen */}
        <div className="space-y-2">
          {q.options.map(o => {
            const isSelected = given === o.id
            return (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                disabled={submitting}
                className={`w-full text-left rounded border px-3 py-2 transition-shadow ${isSelected ? "border-blue-500 ring-1 ring-blue-500" : "hover:shadow-sm"}`}
              >
                {o.text}
                {showFeedback && isSelected && (
                  <span className={`ml-2 text-xs ${o.isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {o.isCorrect ? "✓ richtig" : "✗ falsch"}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation unten */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
          Zurück
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))} disabled={idx === questions.length - 1}>
            Weiter
          </Button>
          <Button variant="destructive" onClick={finish} disabled={submitting}>
            Beenden & Auswerten
          </Button>
        </div>
      </div>

      {/* ------- Seitenleiste (Fragenübersicht) ------- */}
      {navOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fragenübersicht"
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setNavOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-[320px] bg-white dark:bg-card border-r shadow-xl p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Fragenübersicht</div>
              <Button variant="outline" onClick={() => setNavOpen(false)}>Schließen</Button>
            </div>

            <div className="space-y-4">
              {groups.map((g, gi) => (
                <div key={`${g.id ?? "single"}-${gi}`} className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {g.id ? g.label : "Einzelfragen"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.indices.map((i) => {
                      const n = i + 1
                      const answered = !!answers[questions[i].id]
                      const isCurrent = i === idx
                      return (
                        <button
                          key={i}
                          onClick={() => { setIdx(i); setNavOpen(false) }}
                          className={[
                            "h-9 w-9 rounded-full border text-sm font-medium grid place-items-center",
                            answered ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-muted/40",
                            isCurrent ? "ring-2 ring-blue-500" : "hover:shadow-sm",
                          ].join(" ")}
                          title={answered ? `Frage ${n} (beantwortet)` : `Frage ${n} (offen)`}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              Tipp: <kbd className="px-1 py-0.5 rounded border">F</kbd> öffnen/schließen.
            </div>
          </aside>
        </div>
      )}

      {/* ------- Lightbox ------- */}
      {lightboxOpen && media.length > 0 && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Bildanzeige"
          className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeLightbox}
              className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-white/90 text-black text-xl leading-none grid place-items-center shadow"
              aria-label="Schließen"
              title="Schließen (Esc)"
            >
              ×
            </button>

            {media.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-10 px-3 rounded-r bg-white/80 text-black shadow"
                  aria-label="Vorheriges Bild"
                  title="Vorheriges Bild (←)"
                >
                  ‹
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-10 px-3 rounded-l bg-white/80 text-black shadow"
                  aria-label="Nächstes Bild"
                  title="Nächstes Bild (→)"
                >
                  ›
                </button>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media[lightboxIndex].url}
              alt={media[lightboxIndex].alt || ""}
              className="max-h-[95vh] max-w-[95vw] object-contain select-none"
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* ------- Laborwerte ------- */}
      {labOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Laborwerte"
          className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4"
          onClick={() => setLabOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg border bg-white dark:bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">Laborwerte</h2>
              <div className="flex items-center gap-2">
                <input
                  className="input h-9 w-64"
                  placeholder="Suchen (Name, Kategorie, Einheit)…"
                  value={labQuery}
                  onChange={(e) => setLabQuery(e.target.value)}
                  autoFocus
                />
                <Button variant="outline" onClick={() => setLabOpen(false)}>Schließen</Button>
              </div>
            </div>

            <div className="p-0">
              {labLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Lade Laborwerte…</div>
              ) : labError ? (
                <div className="p-4 text-sm text-red-600">{labError}</div>
              ) : (
                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-secondary">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Einheit</th>
                        <th className="px-4 py-2 font-medium">Referenz</th>
                        <th className="px-4 py-2 font-medium">Kategorie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLabs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                            Keine Treffer.
                          </td>
                        </tr>
                      ) : (
                        filteredLabs.map((lv) => (
                          <tr key={lv.id} className="odd:bg-muted/40">
                            <td className="px-4 py-2">{lv.name}</td>
                            <td className="px-4 py-2">{lv.unit}</td>
                            <td className="px-4 py-2">{lv.refRange}</td>
                            <td className="px-4 py-2">{lv.category}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                Tipp: <kbd className="px-1 py-0.5 rounded border">L</kbd> öffnen, <kbd className="px-1 py-0.5 rounded border">Esc</kbd> schließen, <kbd className="px-1 py-0.5 rounded border">P</kbd> Pause/Weiter, <kbd className="px-1 py-0.5 rounded border">F</kbd> Fragenübersicht.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}