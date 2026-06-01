"use client"

import { useEffect, useState } from "react"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type StreakState = {
  currentStreak: number
  longestStreak: number
  lastActiveDayKey: string | null
}

const MILESTONE_LABEL: Record<number, string> = {
  3: "3 Tage in Folge!",
  7: "1 Woche-Streak! 🔥",
  14: "2 Wochen am Stück!",
  30: "30-Tage-Streak — Boss-Level.",
  60: "60 Tage in Folge!",
  100: "100 Tage. Lernlegende.",
  180: "Ein halbes Jahr Streak!",
  365: "Ein ganzes Jahr Lernrhythmus!",
}

/**
 * Header-Badge mit aktueller Streak-Zahl. Hört auf Generator-Events,
 * um Milestones als Toast zu feiern.
 */
export function StreakBadge() {
  const [streak, setStreak] = useState<StreakState | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/streak", { credentials: "include" })
        if (!res.ok) {
          setLoaded(true)
          return
        }
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (data?.ok && data.streak) {
          setStreak({
            currentStreak: data.streak.currentStreak ?? 0,
            longestStreak: data.streak.longestStreak ?? 0,
            lastActiveDayKey: data.streak.lastActiveDayKey ?? null,
          })
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onGenerated(e: Event) {
      const detail = (e as CustomEvent<{
        currentStreak?: number
        longestStreak?: number
        milestoneJustReached?: number | null
      }>).detail
      if (!detail) return
      const cur = typeof detail.currentStreak === "number" ? detail.currentStreak : null
      const long = typeof detail.longestStreak === "number" ? detail.longestStreak : null
      if (cur != null) {
        setStreak((prev) => ({
          currentStreak: cur,
          longestStreak: long ?? prev?.longestStreak ?? cur,
          lastActiveDayKey: prev?.lastActiveDayKey ?? null,
        }))
      }
      const m = detail.milestoneJustReached
      if (typeof m === "number" && m > 0) {
        toast.success(MILESTONE_LABEL[m] ?? `Streak: ${m} Tage in Folge!`, {
          description: "Bleib dran – jeder Tag zählt.",
          duration: 6000,
        })
      }
    }
    window.addEventListener("fragenkreuzen:streak-updated", onGenerated)
    return () =>
      window.removeEventListener("fragenkreuzen:streak-updated", onGenerated)
  }, [])

  if (!loaded || !streak || streak.currentStreak <= 0) return null

  const isHot = streak.currentStreak >= 7
  return (
    <span
      title={`Aktueller Streak: ${streak.currentStreak} Tage · Längster: ${streak.longestStreak}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        isHot
          ? "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300"
          : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
      )}
      aria-label={`Streak: ${streak.currentStreak} Tage in Folge`}
    >
      <Flame className="h-3.5 w-3.5" aria-hidden="true" />
      {streak.currentStreak}
    </span>
  )
}
