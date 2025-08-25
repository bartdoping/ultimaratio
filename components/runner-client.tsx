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

// zeigt mm:ss bzw. ab 1h hh:mm:ss
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
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>(initialAnswers)
  const [submitting, setSubmitting] = useState(false)

  // ------- Timer: zählt hoch, pausierbar -------
  const [elapsed, setElapsed] = useState(0)     // Sekunden seit Start
  const [running, setRunning] = useState(true)  // true = läuft, false = pausiert

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  // ------- Prüfungsmodus (Standard: EIN) -------
  // EIN  = KEIN Sofort-Feedback
  // AUS  = Sofort-Feedback anzeigen
  const [examMode, setExamMode] = useState(true)

  // ------- Lightbox (Bilder) -------
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  // ------- Laborwerte Panel -------
  const [labOpen, setLabOpen] = useState(false)
  const [labLoading, setLabLoading] = useState(false)
  const [labError, setLabError] = useState<string | null>(null)
  const [labValues, setLabValues] = useState<LabValue[]>([])
  const [labQuery, setLabQuery] = useState("")

  // ------- Oberarztkommentar -------
  const [tipOpen, setTipOpen] = useState(false)

  // aktuelle Frage
  const q = questions[idx]
  const given = answers[q.id]
  const media = (q.media ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const hasTip = !!(q.tip && q.tip.trim().length)

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

  // ------- Lightbox (Bilder) -------
  function openLightbox(i: number) {
    setLightboxIndex(i)
    setLightboxOpen(true)
  }
  function closeLightbox() {
    setLightboxOpen(false)
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }
  function nextImage() {
    if (!media.length) return
    setLightboxIndex(i => (i + 1) % media.length)
  }
  function prevImage() {
    if (!media.length) return
    setLightboxIndex(i => (i - 1 + media.length) % media.length)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Lightbox Shortcuts
      if (lightboxOpen) {
        if (e.key === "Escape") closeLightbox()
        if (e.key === "ArrowRight") nextImage()
        if (e.key === "ArrowLeft") prevImage()
        return
      }
      // Labs Shortcut
      if (e.key.toLowerCase() === "l") {
        e.preventDefault()
        setLabOpen(true)
      }
      if (labOpen && e.key === "Escape") {
        setLabOpen(false)
      }
      // Timer Shortcut (P = Pause/Weiter)
      if (e.key.toLowerCase() === "p") {
        e.preventDefault()
        setRunning(r => !r)
      }
      // Prüfungsmodus (M) toggle
      if (e.key.toLowerCase() === "m") {
        e.preventDefault()
        setExamMode(m => !m)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxOpen, labOpen, media.length])

  useEffect(() => {
    if (lightboxOpen) {
      overlayRef.current?.requestFullscreen?.().catch(() => {})
    }
  }, [lightboxOpen])

  // ------- Laborwerte: Lazy Load beim Öffnen -------
  useEffect(() => {
    if (!labOpen || labValues.length > 0 || labLoading) return
    ;(async () => {
      setLabLoading(true)
      setLabError(null)
      try {
        const res = await fetch("/api/labs")
        const raw = await res.json().catch(() => null)
        const arr =
          (Array.isArray(raw) ? raw
            : (raw?.items || raw?.labs || raw?.data || [])) as any[]
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
    const q = labQuery.trim().toLowerCase()
    if (!q) return labValues
    return labValues.filter((lv) =>
      [lv.name, lv.unit, lv.refRange, lv.category]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q))
    )
  }, [labValues, labQuery])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Frage {idx + 1} / {questions.length} ({progress})</span>

        <div className="flex items-center gap-3">
          {/* Prüfungsmodus-Schalter */}
          <label className="flex items-center gap-2 cursor-pointer select-none" title="Prüfungsmodus EIN: kein Sofort-Feedback (M zum Umschalten)">
            <input
              type="checkbox"
              className="sr-only"
              checked={examMode}
              onChange={(e) => setExamMode(e.target.checked)}
            />
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${examMode ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${examMode ? "translate-x-5" : "translate-x-1"}`} />
            </span>
            <span>Prüfungsmodus</span>
          </label>

          <Button variant="outline" onClick={() => setLabOpen(true)} title="Laborwerte anzeigen (L)">
            Laborwerte
          </Button>

          <div className="flex items-center gap-2">
            <span>Zeit: {formatUp(elapsed)}</span>
            <Button
              variant="outline"
              onClick={() => setRunning(r => !r)}
              title="Timer pausieren/fortsetzen (P)"
            >
              {running ? "Pause" : "Weiter"}
            </Button>
          </div>
        </div>
      </div>

      <div className="card card-body space-y-4">
        {/* Frage */}
        <p className="font-medium">{q.stem}</p>

        {/* Oberarztkommentar (nur wenn vorhanden) */}
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

        {/* Medien (Thumbnails / klickbar mit Hover-Hinweis) */}
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
                {/* Sofort-Feedback NUR wenn Prüfungsmodus AUS.
                   Hinweis: allowImmediateFeedback wird hier bewusst ignoriert,
                   da der Schalter das Verhalten übersteuert. */}
                {!examMode && isSelected && (
                  <span className={`ml-2 text-xs ${o.isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {o.isCorrect ? "✓ richtig" : "✗ falsch"}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
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

      {/* ------- Lightbox / Vollbild-Overlay (Bilder) ------- */}
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

      {/* ------- Laborwerte Overlay ------- */}
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
                Tipp: <kbd className="px-1 py-0.5 rounded border">L</kbd> öffnen, <kbd className="px-1 py-0.5 rounded border">Esc</kbd> schließen, <kbd className="px-1 py-0.5 rounded border">P</kbd> Pause/Weiter, <kbd className="px-1 py-0.5 rounded border">M</kbd> Prüfungsmodus.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}