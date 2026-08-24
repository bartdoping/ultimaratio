"use client"

import { useMemo } from "react"
import { CalendarDays, Minus, Plus, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LEARN_PLANS,
  LEARN_PLAN_IDS,
  generatableTopics,
  getLearnPlanDay,
  planFirstDay,
  planLastDay,
  type LearnPlanId,
} from "@/lib/learn-plans"

type Props = {
  planId: LearnPlanId
  onPlanChange: (planId: LearnPlanId) => void
  day: number
  onDayChange: (day: number) => void
  disabled?: boolean
}

/**
 * Auswahl von Lernplan und Tag.
 *
 * Der Nutzer wählt Plan und Tag; daraus wird beim Generieren zufällig eines
 * der Themen dieses Tages gezogen. Die Themen werden vollständig angezeigt,
 * damit transparent ist, worauf sich die Auswahl bezieht.
 */
export function LearnPlanPicker({
  planId,
  onPlanChange,
  day,
  onDayChange,
  disabled = false,
}: Props) {
  const lastDay = planLastDay(planId)
  const entry = useMemo(() => getLearnPlanDay(planId, day), [planId, day])
  const topics = useMemo(() => generatableTopics(planId, day), [planId, day])

  const clamp = (n: number) => Math.min(lastDay, Math.max(planFirstDay(), n))

  return (
    <div className="space-y-3">
      {/* Plan-Auswahl */}
      <div className="inline-flex items-center rounded-full border bg-background/80 p-0.5 text-xs">
        {LEARN_PLAN_IDS.map((id) => {
          const active = id === planId
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPlanChange(id)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {LEARN_PLANS[id].label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          <label htmlFor="learnplan-day">Tag</label>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border bg-background p-0.5">
          <button
            type="button"
            onClick={() => onDayChange(clamp(day - 1))}
            disabled={disabled || day <= planFirstDay()}
            aria-label="Vorheriger Tag"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            id="learnplan-day"
            type="number"
            inputMode="numeric"
            min={planFirstDay()}
            max={lastDay}
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
            disabled={disabled || day >= lastDay}
            aria-label="Nächster Tag"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground">von {lastDay}</span>

        {entry && (
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-foreground">
            {entry.subject}
          </span>
        )}
      </div>

      {/* Schnellsprung über den Tagesbereich */}
      <input
        type="range"
        min={planFirstDay()}
        max={lastDay}
        value={day}
        disabled={disabled}
        onChange={(e) => onDayChange(clamp(Number(e.target.value)))}
        aria-label={`Tag ${day} von ${lastDay}`}
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
              className="rounded-full border bg-card px-2 py-0.5 text-[11px] leading-relaxed text-muted-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
