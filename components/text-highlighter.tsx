"use client"

import { useCallback, useMemo, useState } from "react"

export type HighlightSet = Set<number>

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

type Token =
  | { type: "word"; index: number; text: string }
  | { type: "space"; text: string }
  | { type: "break" }

const WORD_PATTERN = /(\s+|\n)/

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let wordIdx = 0
  const parts = text.split(WORD_PATTERN)
  for (const part of parts) {
    if (!part) continue
    if (part === "\n") {
      tokens.push({ type: "break" })
      continue
    }
    if (/^\s+$/.test(part)) {
      tokens.push({ type: "space", text: part })
      continue
    }
    tokens.push({ type: "word", index: wordIdx, text: part })
    wordIdx += 1
  }
  return tokens
}

export function TextHighlighter({
  text,
  questionId,
  value,
  onChange,
}: TextHighlighterProps) {
  const [internal, setInternal] = useState<HighlightSet>(() => new Set())
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

  const tokens = useMemo(() => tokenize(text), [text])

  const toggle = useCallback(
    (idx: number) => {
      setActive((prev) => {
        const next = new Set(prev)
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
        return next
      })
    },
    [setActive]
  )

  return (
    <div
      data-text-highlighter="true"
      data-question-id={questionId}
      className="text-base leading-relaxed select-text"
    >
      {tokens.map((tok, i) => {
        if (tok.type === "break") {
          return <br key={`br-${i}`} />
        }
        if (tok.type === "space") {
          return <span key={`sp-${i}`}>{tok.text}</span>
        }
        const isOn = active.has(tok.index)
        return (
          <button
            key={`w-${tok.index}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggle(tok.index)
            }}
            aria-pressed={isOn}
            title={isOn ? "Markierung entfernen" : "Markieren"}
            className={
              "inline rounded-sm px-0.5 py-0 align-baseline transition-colors " +
              (isOn
                ? "bg-yellow-200 text-foreground dark:bg-yellow-500/40"
                : "hover:bg-muted/60")
            }
          >
            {tok.text}
          </button>
        )
      })}
    </div>
  )
}
