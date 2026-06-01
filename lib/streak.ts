import prisma from "@/lib/db"
import { getGeneratorDayKey } from "@/lib/generator-limits"

/**
 * Streaks pro User – best-effort. Aufrufe niemals werfen.
 *
 * Logik:
 * - Day-Key in Europe/Berlin (wie Quota).
 * - Wenn lastActiveDayKey === heute → kein Change (Idempotent).
 * - Wenn lastActiveDayKey === gestern → currentStreak +1.
 * - Sonst (länger her) → currentStreak = 1.
 * - longestStreak wird mitgeführt.
 * - Milestones: 3, 7, 14, 30, 60, 100 → milestonesReached zählt jedes Erreichen.
 */

export type StreakSnapshot = {
  currentStreak: number
  longestStreak: number
  lastActiveDayKey: string | null
  milestoneJustReached: number | null // wenn heute eine Milestone erreicht wurde
}

const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365] as const

function yesterdayKey(today: string): string {
  // today = "YYYY-MM-DD" → "YYYY-MM-DD" of previous day
  const [y, m, d] = today.split("-").map((x) => parseInt(x, 10))
  if (!y || !m || !d) return ""
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

/**
 * Markiert den heutigen Tag als aktiv und aktualisiert den Streak.
 * Best-effort, schluckt Fehler.
 */
export async function recordStreakActivity(userId: string): Promise<StreakSnapshot | null> {
  if (!userId) return null
  const today = getGeneratorDayKey()
  const yesterday = yesterdayKey(today)

  try {
    const existing = await prisma.userStreak.findUnique({
      where: { userId },
    })

    if (existing?.lastActiveDayKey === today) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        lastActiveDayKey: existing.lastActiveDayKey,
        milestoneJustReached: null,
      }
    }

    let nextCurrent: number
    if (!existing) {
      nextCurrent = 1
    } else if (existing.lastActiveDayKey === yesterday) {
      nextCurrent = existing.currentStreak + 1
    } else {
      nextCurrent = 1
    }

    const nextLongest = Math.max(existing?.longestStreak ?? 0, nextCurrent)
    const milestoneJustReached = MILESTONES.find((m) => m === nextCurrent) ?? null
    const nextMilestoneCount =
      (existing?.milestonesReached ?? 0) + (milestoneJustReached ? 1 : 0)

    await prisma.userStreak.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: nextCurrent,
        longestStreak: nextLongest,
        lastActiveDayKey: today,
        milestonesReached: milestoneJustReached ? 1 : 0,
      },
      update: {
        currentStreak: nextCurrent,
        longestStreak: nextLongest,
        lastActiveDayKey: today,
        milestonesReached: nextMilestoneCount,
      },
    })

    return {
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastActiveDayKey: today,
      milestoneJustReached: milestoneJustReached ?? null,
    }
  } catch (err) {
    console.warn("[streak] recordStreakActivity failed", err)
    return null
  }
}

export async function getStreak(userId: string): Promise<StreakSnapshot | null> {
  if (!userId) return null
  try {
    const row = await prisma.userStreak.findUnique({ where: { userId } })
    if (!row) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDayKey: null,
        milestoneJustReached: null,
      }
    }
    // Wenn lastActive nicht heute UND nicht gestern → Streak gilt als verloren, sobald ein voller Tag dazwischen liegt.
    const today = getGeneratorDayKey()
    const yesterday = yesterdayKey(today)
    const stillAlive =
      row.lastActiveDayKey === today || row.lastActiveDayKey === yesterday
    return {
      currentStreak: stillAlive ? row.currentStreak : 0,
      longestStreak: row.longestStreak,
      lastActiveDayKey: row.lastActiveDayKey,
      milestoneJustReached: null,
    }
  } catch (err) {
    console.warn("[streak] getStreak failed", err)
    return null
  }
}

export const STREAK_MILESTONES = MILESTONES
