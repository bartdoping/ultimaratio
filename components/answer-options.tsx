"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Strikethrough, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Option = {
  id: string
  text: string
  isCorrect: boolean
  explanation?: string | null
}

type AnswerOptionsProps = {
  options: Option[]
  selectedOptionId?: string
  onSelect: (optionId: string) => void
  showFeedback?: boolean
  submitting?: boolean
}

export function AnswerOptions({
  options,
  selectedOptionId,
  onSelect,
  showFeedback = false,
  submitting = false,
}: AnswerOptionsProps) {
  const [strikethroughIds, setStrikethroughIds] = useState<Set<string>>(new Set())
  const [openExplanations, setOpenExplanations] = useState<Set<string>>(new Set())

  const toggleStrike = (optionId: string) => {
    setStrikethroughIds((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) next.delete(optionId)
      else next.add(optionId)
      return next
    })
  }

  const toggleExplanation = (optionId: string) => {
    setOpenExplanations((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) next.delete(optionId)
      else next.add(optionId)
      return next
    })
  }

  // Bei Anzeige des Feedbacks: gewählte und korrekte Option automatisch aufklappen.
  useEffect(() => {
    if (!showFeedback) {
      setOpenExplanations(new Set())
      return
    }
    setOpenExplanations((prev) => {
      const next = new Set(prev)
      for (const opt of options) {
        if (opt.isCorrect || opt.id === selectedOptionId) next.add(opt.id)
      }
      return next
    })
    // Nur beim Wechsel von vorher→nachher auf showFeedback öffnen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFeedback])

  return (
    <RadioGroup
      value={selectedOptionId || ""}
      onValueChange={(value) => {
        if (submitting) return
        onSelect(value)
      }}
      className="space-y-1.5"
      aria-label="Antwortoptionen"
    >
      {options.map((option, index) => {
        const isSelected = selectedOptionId === option.id
        const isStruck = strikethroughIds.has(option.id)
        const isExplOpen = openExplanations.has(option.id)
        const letter = String.fromCharCode(65 + index)
        const hasExplanation = !!option.explanation
        const isCorrect = option.isCorrect

        return (
          <div
            key={option.id}
            className={cn(
              "group rounded-lg border bg-background transition-colors",
              isSelected && !showFeedback && "border-primary/60 bg-primary/5 ring-1 ring-primary/30",
              showFeedback && isCorrect && "border-emerald-500/60 bg-emerald-500/5",
              showFeedback && isSelected && !isCorrect && "border-red-500/60 bg-red-500/5",
              isStruck && "opacity-70"
            )}
          >
            {/* Hauptzeile: Letter + Text + Right-Action (Strike oder Feedback-Chip) */}
            <div className="flex items-start gap-2 px-2.5 py-2 sm:px-3">
              {/* Tappbarer Bereich für Auswahl: Letter + Text */}
              <Label
                htmlFor={option.id}
                className={cn(
                  "flex flex-1 cursor-pointer items-start gap-2.5 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-1",
                  isStruck && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    showFeedback && isCorrect
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : showFeedback && isSelected
                        ? "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
                        : isSelected
                          ? "border-primary/60 bg-primary text-primary-foreground"
                          : "border-border bg-muted text-muted-foreground"
                  )}
                  aria-label={`Option ${letter}, Taste ${letter} oder ${index + 1}`}
                >
                  {letter}
                </span>

                <span
                  className={cn(
                    "flex-1 select-text pt-0.5 text-[15px] leading-snug sm:text-base",
                    isStruck && "line-through"
                  )}
                >
                  {option.text}
                </span>

                <RadioGroupItem
                  value={option.id}
                  id={option.id}
                  disabled={submitting}
                  className="sr-only"
                />
              </Label>

              {/* Rechte Seite, gleiche Höhe wie Option: Feedback-Chip nach Bestätigung, sonst Strike-Icon */}
              {showFeedback ? (
                <span
                  className={cn(
                    "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                    isCorrect
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : isSelected
                        ? "bg-red-500/15 text-red-700 dark:text-red-300"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCorrect ? (
                    <>
                      <Check className="h-3 w-3" /> Richtig
                    </>
                  ) : isSelected ? (
                    <>
                      <X className="h-3 w-3" /> Falsch
                    </>
                  ) : null}
                </span>
              ) : (
                <StrikeIconButton
                  active={isStruck}
                  disabled={submitting}
                  onClick={() => toggleStrike(option.id)}
                />
              )}
            </div>

            {/* Erklärung-Toggle als schmale Bottom-Bar nach Bestätigung */}
            {showFeedback && hasExplanation && (
              <button
                type="button"
                onClick={() => toggleExplanation(option.id)}
                aria-expanded={isExplOpen}
                className="flex w-full items-center justify-between gap-2 border-t px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 sm:px-3"
              >
                <span>Erklärung {letter}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExplOpen && "rotate-180"
                  )}
                />
              </button>
            )}

            {showFeedback && hasExplanation && isExplOpen && (
              <div className="border-t bg-muted/30 px-2.5 py-2 text-sm leading-relaxed text-muted-foreground sm:px-3">
                {option.explanation}
              </div>
            )}
          </div>
        )
      })}
    </RadioGroup>
  )
}

function StrikeIconButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled) onClick()
      }}
      disabled={disabled}
      aria-pressed={active}
      title={active ? "Streichung aufheben" : "Option streichen"}
      aria-label={active ? "Streichung aufheben" : "Option streichen"}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "border-foreground/30 bg-muted text-foreground",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      <Strikethrough className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )
}
