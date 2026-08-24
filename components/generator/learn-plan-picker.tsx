"use client"

import { useMemo } from "react"
import { CalendarDays, Minus, Plus, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LEARN_PLAN_FIRST_DAY,
  LEARN_PLAN_LAST_DAY,
  generatableTopics,
  getLearnPlanDay,
} from "@/lib/learn-plan-m2"

type Props = {
  day: number
  onDayChange: (day: number) => void
  disabled?: boolean
}

/**
 * Tagesauswahl für den M2-Lernplan.
 *
 * Der Nutzer wählt einen Tag; daraus wird beim Generieren zufällig eines der
 * Themen dieses Tages gezogen. Die Themen werden vollständig angezeigt, damit
 * transparent ist, worauf sich die Auswahl bezieht.
 */
export function LearnPlanPicker({ day, onDayChange, disabled = false }: Props) {
  const entry = useMemo(() => getLearnPlanDay(day), [day])
  const topics = useMemo(() => generatableTopics(day), [day])

  const clamp = (n: number) =>
    Math.min(LEARN_PLAN_LAST_DAY, Math.max(LEARN_PLAN_FIRST_DAY, n))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          <label htmlFor="learnplan-day">Tag</label>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border bg-background p-0.5">
          <button
            type="button"
            onClick={() => onDayChange(clamp(day - 1))}
            disabled={disabled || day <= LEARN_PLAN_FIRST_DAY}
            aria-label="Vorheriger Tag"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            id="learnplan-day"
            type="number"
            inputMode="numeric"
            min={LEARN_PLAN_FIRST_DAY}
            max={LEARN_PLAN_LAST_DAY}
            value={day}
            disabled={disabled}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) onDayChange(clamp(n))
            }}
            className="h-8 w-14 bg-transparent text-center text-sm font-semibold tabular-nums focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onDayChange(clamp(day + 1))}
            disabled={disabled || day >= LEARN_PLAN_LAST_DAY}
            aria-label="Nächster Tag"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground">von {LEARN_PLAN_LAST_DAY}</span>

        {entry && (
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-foreground">
            {entry.subject}
          </span>
        )}
      </div>

      {/* Schnellsprung über den Tagesbereich */}
      <input
        type="range"
        min={LEARN_PLAN_FIRST_DAY}
        max={LEARN_PLAN_LAST_DAY}
        value={day}
        disabled={disabled}
        onChange={(e) => onDayChange(clamp(Number(e.target.value)))}
        aria-label={`Tag ${day} von ${LEARN_PLAN_LAST_DAY}`}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
      />

      <div className="rounded-xl border bg-background/60 p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          {topics.length} Themen an diesem Tag — beim Generieren wird zufällig eines gewählt.
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <li
              key={t}
              className={cn(
                "rounded-full border bg-card px-2 py-0.5 text-[11px] leading-relaxed text-muted-foreground"
              )}
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
