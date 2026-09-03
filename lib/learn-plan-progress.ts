import { generatableTopics, planFirstDay, planLastDay, type LearnPlanId } from "@/lib/learn-plans"

/**
 * Fortschritt im Lernplan.
 *
 * Bewusst im Browser gespeichert (localStorage) und nicht in der Datenbank:
 * Der Generator legt heute nichts an, und ein Gerätewechsel ist der Preis
 * dafür, dass es überhaupt einen Fortschritt gibt. Ein Lernplan ohne
 * Fortschrittsanzeige ist nur eine Themenliste.
 *
 * Der rechnende Teil ist frei von Browser-Zugriffen und damit prüfbar; nur
 * `loadProgress`/`saveProgress` fassen localStorage an.
 */

export type PlanProgress = {
  /** Tage, an denen mindestens eine Frage erzeugt wurde. */
  done: number[]
  /** Prüfungstermin als ISO-Datum (YYYY-MM-DD) oder null. */
  examDate: string | null
  /** Bereits gezogene Themen je Tag — verhindert Wiederholungen. */
  used: Record<string, string[]>
}

export const EMPTY_PROGRESS: PlanProgress = { done: [], examDate: null, used: {} }

const KEY = (planId: LearnPlanId) => `fragenkreuzen:plan:${planId}`

// ---------------------------------------------------------------------------
// Reine Logik
// ---------------------------------------------------------------------------

/** Kalendertage zwischen zwei ISO-Daten, unabhängig von der Uhrzeit. */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const a = Date.parse(`${fromIso}T00:00:00Z`)
  const b = Date.parse(`${toIso}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((b - a) / 86_400_000)
}

/**
 * Welcher Plantag ist heute dran?
 *
 * Der letzte Tag des Plans liegt auf dem Prüfungstermin; von dort wird
 * zurückgerechnet. Liegt die Prüfung weiter weg als der Plan lang ist, ist
 * Tag 1 dran; liegt sie in der Vergangenheit, der letzte Tag.
 */
export function dayForDate(
  planId: LearnPlanId,
  examDateIso: string,
  todayIso: string
): number | null {
  const rest = daysBetween(todayIso, examDateIso)
  if (rest === null) return null
  const last = planLastDay(planId)
  const first = planFirstDay()
  return Math.min(last, Math.max(first, last - rest))
}

/** Heutiges Datum als ISO-Tag in lokaler Zeit (nicht UTC — sonst springt es abends). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Zieht ein Thema des Tages, das in dieser Sitzung noch nicht dran war.
 *
 * Sind alle Themen des Tages durch, beginnt der Zyklus von vorn — sonst gäbe
 * es irgendwann gar keine Frage mehr. Ohne diese Funktion liefert dreimaliges
 * Generieren an Tag 25 regelmäßig dreimal dasselbe Thema.
 */
export function pickUnusedTopic(
  planId: LearnPlanId,
  day: number,
  used: string[],
  rand: () => number = Math.random
): { topic: string; usedAfter: string[] } | null {
  const alle = generatableTopics(planId, day)
  if (alle.length === 0) return null

  const offen = alle.filter((t) => !used.includes(t))
  const pool = offen.length > 0 ? offen : alle
  // Bei Zyklusende beginnt die Merkliste neu, damit sie nicht unbegrenzt wächst.
  const basis = offen.length > 0 ? used : []

  const topic = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
  return { topic, usedAfter: [...basis, topic] }
}

/** Anteil der bearbeiteten Tage, 0–1. */
export function completionRatio(planId: LearnPlanId, done: number[]): number {
  const last = planLastDay(planId)
  if (last <= 0) return 0
  const gueltig = new Set(done.filter((d) => d >= planFirstDay() && d <= last))
  return gueltig.size / last
}

// ---------------------------------------------------------------------------
// Speicherung (nur im Browser)
// ---------------------------------------------------------------------------

export function loadProgress(planId: LearnPlanId): PlanProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS
  try {
    const raw = window.localStorage.getItem(KEY(planId))
    if (!raw) return EMPTY_PROGRESS
    const parsed = JSON.parse(raw) as Partial<PlanProgress>
    return {
      done: Array.isArray(parsed.done) ? parsed.done.filter((n) => Number.isInteger(n)) : [],
      examDate: typeof parsed.examDate === "string" ? parsed.examDate : null,
      used:
        parsed.used && typeof parsed.used === "object"
          ? (parsed.used as Record<string, string[]>)
          : {},
    }
  } catch {
    // Privater Modus, gesperrter Speicher, kaputter Eintrag — nie werfen.
    return EMPTY_PROGRESS
  }
}

export function saveProgress(planId: LearnPlanId, progress: PlanProgress): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY(planId), JSON.stringify(progress))
  } catch {
    // Speicher nicht verfügbar — der Fortschritt geht verloren, die App nicht.
  }
}
