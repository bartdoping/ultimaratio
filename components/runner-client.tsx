"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type Question = {
  id: string
  stem: string
  options: { id: string; text: string; isCorrect: boolean }[]
  media?: { id: string; url: string; alt: string; order: number }[]
}

type Props = {
  attemptId: string
  examId: string
  passPercent: number
  allowImmediateFeedback: boolean
  questions: Question[]
  initialAnswers: Record<string, string | undefined>
}

function format(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function RunnerClient(props: Props) {
  const { attemptId, allowImmediateFeedback, questions, initialAnswers } = props
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>(initialAnswers)
  const [submitting, setSubmitting] = useState(false)
  const [left, setLeft] = useState(60 * 60) // 60 Minuten Beispiel

  // Lightbox-State
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  // Timer
  useEffect(() => {
    const t = setInterval(() => setLeft(v => (v > 0 ? v - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  // aktuelle Frage
  const q = questions[idx]
  const given = answers[q.id]
  const media = (q.media ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

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

  // Lightbox
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
      if (!lightboxOpen) return
      if (e.key === "Escape") closeLightbox()
      if (e.key === "ArrowRight") nextImage()
      if (e.key === "ArrowLeft") prevImage()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxOpen, media.length])

  useEffect(() => {
    if (lightboxOpen) {
      overlayRef.current?.requestFullscreen?.().catch(() => {})
    }
  }, [lightboxOpen])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Frage {idx + 1} / {questions.length} ({progress})</span>
        <span>Zeit: {format(left)}</span>
      </div>

      <div className="rounded border p-4 space-y-4">
        {/* Frage */}
        <p className="font-medium">{q.stem}</p>

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
                {/* Bild */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt || ""}
                  className="h-28 w-40 object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                {/* sanfter Overlay-Tint */}
                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                {/* kleines Lupe-Icon oben rechts */}
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
                {allowImmediateFeedback && isSelected && (
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

      {/* Lightbox / Vollbild-Overlay */}
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
    </div>
  )
}