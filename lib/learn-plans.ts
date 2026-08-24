import { LEARN_PLAN_M1_DAYS } from "@/lib/learn-plan-m1"
import { LEARN_PLAN_M2_DAYS } from "@/lib/learn-plan-m2"

/**
 * Registry der Lernpläne.
 *
 * Die eigentlichen Tagesdaten liegen je Plan in einer eigenen Datei; hier
 * stehen ausschließlich Typen, gemeinsame Logik und die Zusammenstellung.
 * Neue Durchgänge werden durch Austausch der jeweiligen Datendatei gepflegt.
 */

export type LearnPlanDay = {
  day: number
  /** Fachgebiet(e) des Tages, wie im Plan ausgewiesen. */
  subject: string
  topics: string[]
}

export type LearnPlanId = "m2" | "m1"

export type LearnPlan = {
  id: LearnPlanId
  /** Vollständige Bezeichnung, z. B. für Überschriften. */
  label: string
  /** Kurzform für enge Schaltflächen. */
  shortLabel: string
  days: readonly LearnPlanDay[]
}

export const LEARN_PLANS: Record<LearnPlanId, LearnPlan> = {
  m2: {
    id: "m2",
    label: "M2-Lernplan · Herbst 2026",
    shortLabel: "M2",
    days: LEARN_PLAN_M2_DAYS,
  },
  m1: {
    id: "m1",
    label: "Physikum · Herbst 2026",
    shortLabel: "Physikum",
    days: LEARN_PLAN_M1_DAYS,
  },
}

/** Reihenfolge in der Oberfläche. */
export const LEARN_PLAN_IDS: readonly LearnPlanId[] = ["m2", "m1"]

export function isLearnPlanId(v: unknown): v is LearnPlanId {
  return v === "m2" || v === "m1"
}

export function getPlan(planId: LearnPlanId): LearnPlan {
  return LEARN_PLANS[planId]
}

export function planFirstDay(): number {
  return 1
}

export function planLastDay(planId: LearnPlanId): number {
  return LEARN_PLANS[planId].days.length
}

/**
 * Einträge, die keine generierbaren Fachthemen sind (Meta-/Navigationsposten).
 * "Sammelsurium"-Einträge sind bewusst ausgenommen: Sie bündeln Restwissen
 * ohne klaren Fokus und führen zu beliebigen Fragen. Ebenso die Einträge zu
 * den Staatsexamina selbst, die im Plan als Orientierungspunkte stehen.
 */
const NON_TOPIC_PATTERNS: readonly RegExp[] = [
  /^Handbuch\b/i,
  /^Kreuztipps\b/i,
  /^Sammelsurium\b/i,
  /M[12]-Lernplan/i,
  /^(Erstes|Zweites) Staatsexamen/i,
  /^Tag \d+/i,
]

export function isGeneratableTopic(topic: string): boolean {
  const t = topic.trim()
  if (t.length < 3) return false
  return !NON_TOPIC_PATTERNS.some((re) => re.test(t))
}

/** Tag aus einem Plan holen. `null`, wenn die Nummer außerhalb liegt. */
export function getLearnPlanDay(planId: LearnPlanId, day: number): LearnPlanDay | null {
  if (!Number.isInteger(day)) return null
  return LEARN_PLANS[planId].days.find((d) => d.day === day) ?? null
}

/** Nur die Themen eines Tages, die sich zur Fragengenerierung eignen. */
export function generatableTopics(planId: LearnPlanId, day: number): string[] {
  return getLearnPlanDay(planId, day)?.topics.filter(isGeneratableTopic) ?? []
}

/**
 * Wählt zufällig ein Thema des Tages. `rand` ist injizierbar, damit die
 * Auswahl in Tests deterministisch ist.
 */
export function pickRandomTopic(
  planId: LearnPlanId,
  day: number,
  rand: () => number = Math.random
): string | null {
  const topics = generatableTopics(planId, day)
  if (topics.length === 0) return null
  const idx = Math.min(topics.length - 1, Math.floor(rand() * topics.length))
  return topics[idx]
}
