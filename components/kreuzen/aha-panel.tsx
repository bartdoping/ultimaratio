"use client"

import { useState } from "react"
import { Check, ChevronDown, Lightbulb, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import { isMnemonicWorthShowing } from "@/lib/insight-quality"

/**
 * Der Aha-Block nach dem Auflösen.
 *
 * Reihenfolge nach Lernwirkung, nicht nach Vollständigkeit:
 *  1. Falsch gewählt? Zuerst GENAU dieser Fehler: "Du hast X — richtig wäre
 *     das bei …". Das ist der Moment, in dem gelernt wird.
 *  2. Der Aha-Satz: warum die Lösung stimmt.
 *  3. Die Merkregel.
 *  4. Erst auf Wunsch: "Mehr verstehen" — die Vertiefung wird dann erzeugt
 *     bzw. aus dem Pool geladen.
 */
export function AhaPanel({
  question,
  chosenText,
  deepDive,
}: {
  question: BulkQuestion
  chosenText: string
  /** Lädt die Vertiefung; null wenn nicht verfügbar. */
  deepDive: (() => Promise<string | null>) | null
}) {
  const richtig = question.options.find((o) => o.isCorrect)
  const gewaehlt = question.options.find((o) => o.text === chosenText)
  const lagRichtig = !!gewaehlt?.isCorrect
  const b = (o: typeof richtig) => String.fromCharCode(65 + question.options.indexOf(o!))

  const [vertiefung, setVertiefung] = useState<string | null>(question.explanation?.trim() || null)
  const [offen, setOffen] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(false)

  async function mehr() {
    if (vertiefung) {
      setOffen((o) => !o)
      return
    }
    if (!deepDive) return
    setLaedt(true)
    setFehler(false)
    try {
      const t = await deepDive()
      if (t) {
        setVertiefung(t)
        setOffen(true)
      } else setFehler(true)
    } catch {
      setFehler(true)
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="space-y-2.5 animate-fade-in" aria-live="polite">
      {/* 1. Der eigene Fehler zuerst */}
      {!lagRichtig && gewaehlt && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
            <X className="h-3.5 w-3.5" aria-hidden /> Du hast {b(gewaehlt)} gewählt
          </div>
          {gewaehlt.explanation && <p className="mt-1 text-[15px] leading-snug text-foreground">{gewaehlt.explanation}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Check className="h-3.5 w-3.5" aria-hidden /> {lagRichtig ? "Richtig" : `Richtig ist ${b(richtig)}`}
        </div>
        {richtig?.explanation && <p className="mt-1 text-[15px] leading-snug text-foreground">{richtig.explanation}</p>}
      </div>

      {/* 2. Der Aha-Satz */}
      {question.keyTakeaway && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Aha
          </div>
          <p className="mt-1 text-base font-medium leading-snug text-foreground">{question.keyTakeaway}</p>
        </div>
      )}

      {/* 3. Merkregel + ggf. Eselsbrücke */}
      {(question.mustKnow || isMnemonicWorthShowing(question.mnemonic)) && (
        <div className="rounded-2xl border bg-card px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Merke
          </div>
          {question.mustKnow && <p className="mt-1 text-[15px] leading-snug">{question.mustKnow}</p>}
          {isMnemonicWorthShowing(question.mnemonic) && (
            <p className="mt-1.5 text-sm italic text-muted-foreground">{question.mnemonic}</p>
          )}
        </div>
      )}

      {/* 4. Vertiefung nur auf Wunsch */}
      {(deepDive || vertiefung) && (
        <div className="rounded-2xl border bg-card">
          <button
            type="button"
            onClick={mehr}
            disabled={laedt}
            aria-expanded={offen}
            className="tap-target flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          >
            <span>{laedt ? "Wird erklärt …" : "Mehr verstehen"}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", offen && "rotate-180")} aria-hidden />
          </button>
          {fehler && <p className="px-4 pb-3 text-sm text-muted-foreground">Gerade nicht verfügbar — bitte später erneut.</p>}
          {offen && vertiefung && (
            <div className="space-y-2 border-t px-4 py-3">
              {vertiefung.split(/\n\n+/).map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
