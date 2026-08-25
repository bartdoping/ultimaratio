"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  applyRange as applyRangeToSet,
  buildRuns,
  removeRunAt as removeRunAtInSet,
  type HighlightSet,
} from "@/lib/text-highlight"

/**
 * Markierte Stellen eines Textes, als Menge von ZEICHEN-Indizes.
 * Die Logik dazu steht in `lib/text-highlight.ts` — hier bleibt nur die
 * Übersetzung von Browser-Auswahl zu Zeichenpositionen.
 *
 * Der Zustand gilt nur für die laufende Sitzung und wird nie gespeichert.
 */
export type { HighlightSet }

interface TextHighlighterProps {
  text: string
  /** Stabiler Schlüssel der aktuellen Frage; Reset bei Wechsel. */
  questionId: string
  /**
   * Optional kontrollierter Modus: Eltern halten den Markierungs-State je
   * Frage und reichen Wert + Setter rein. Ungenutzt → lokaler State.
   */
  value?: HighlightSet
  onChange?: (next: HighlightSet) => void
}

/**
 * Zeichen-Position eines DOM-Punkts innerhalb des Containers.
 *
 * Funktioniert, weil der Container exakt `text` rendert — keine zusätzlichen
 * Zeichen, keine <br>-Elemente. Zeilenumbrüche kommen über `white-space:
 * pre-wrap` aus dem Text selbst und werden von `Range.toString()` mitgezählt.
 */
function offsetInContainer(container: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange()
  range.setStart(container, 0)
  try {
    range.setEnd(node, offset)
  } catch {
    return -1
  }
  return range.toString().length
}

export function TextHighlighter({
  text,
  questionId,
  value,
  onChange,
}: TextHighlighterProps) {
  const [internal, setInternal] = useState<HighlightSet>(() => new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isControlled = value !== undefined
  const active = isControlled ? value : internal

  const setActive = useCallback(
    (updater: (prev: HighlightSet) => HighlightSet) => {
      if (isControlled) {
        onChange?.(updater(value ?? new Set()))
      } else {
        setInternal((prev) => updater(prev))
      }
    },
    [isControlled, onChange, value]
  )

  const runs = useMemo(() => buildRuns(text, active), [text, active])

  const applyRange = useCallback(
    (start: number, end: number) => {
      setActive((prev) => applyRangeToSet(text, prev, start, end))
    },
    [setActive, text]
  )

  /** Klick ohne Ziehen auf eine Markierung entfernt den ganzen Block. */
  const removeRunAt = useCallback(
    (pos: number) => {
      setActive((prev) => removeRunAtInSet(text, prev, pos))
    },
    [setActive, text]
  )

  /** Liest die aktuelle Auswahl aus und wendet sie an. */
  const consumeSelection = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      return
    }

    const from = offsetInContainer(container, range.startContainer, range.startOffset)
    const to = offsetInContainer(container, range.endContainer, range.endOffset)
    if (from < 0 || to < 0) return

    const start = Math.min(from, to)
    const end = Math.max(from, to)

    if (start === end) {
      // Reiner Klick: auf einer Markierung entfernt er sie, sonst passiert nichts.
      removeRunAt(Math.min(start, Math.max(0, text.length - 1)))
      return
    }

    applyRange(start, end)
    // Blaue Systemauswahl wegnehmen, damit die gelbe Markierung sichtbar wird.
    selection.removeAllRanges()
  }, [applyRange, removeRunAt, text.length])

  /**
   * Der Zeiger wird oft außerhalb des Textes losgelassen (z. B. unterhalb des
   * letzten Absatzes). Deshalb hört der Abschluss der Geste am Dokument mit,
   * sobald sie im Container begonnen hat.
   */
  const handlePointerDown = useCallback(() => {
    const finish = () => {
      document.removeEventListener("pointerup", finish)
      // Erst im nächsten Tick lesen: Der Browser aktualisiert die Auswahl
      // teilweise erst nach dem pointerup-Ereignis.
      window.setTimeout(consumeSelection, 0)
    }
    document.addEventListener("pointerup", finish)
  }, [consumeSelection])

  // Auswahl per Tastatur (Umschalt + Pfeiltasten, Caret-Browsing) ebenfalls
  // übernehmen — sonst wäre die Funktion ohne Maus nicht bedienbar.
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Shift" || (e.shiftKey && e.key.startsWith("Arrow"))) {
        consumeSelection()
      }
    },
    [consumeSelection]
  )

  // Frage gewechselt → hängengebliebene Systemauswahl aufräumen.
  useEffect(() => {
    return () => {
      const sel = typeof window !== "undefined" ? window.getSelection() : null
      sel?.removeAllRanges()
    }
  }, [questionId])

  return (
    <div
      ref={containerRef}
      data-text-highlighter="true"
      data-question-id={questionId}
      onPointerDown={handlePointerDown}
      onKeyUp={handleKeyUp}
      tabIndex={0}
      className="whitespace-pre-wrap text-base leading-relaxed select-text outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
    >
      {runs.map((run) =>
        run.on ? (
          <mark
            key={run.start}
            className="rounded-sm bg-yellow-200 text-foreground dark:bg-yellow-500/40"
          >
            {text.slice(run.start, run.end)}
          </mark>
        ) : (
          <span key={run.start}>{text.slice(run.start, run.end)}</span>
        )
      )}
    </div>
  )
}
