import type { BulkQuestion } from "@/lib/question-bulk-json"
import type { GeneratorSection } from "@/lib/generator-section"

/**
 * Gemeinsame Typen des Kreuz-Modus (Server und Browser).
 */

/** Woher die Fragen kommen. */
export type KreuzenSource =
  | { type: "topic"; topic: string }
  | { type: "plan"; planId: "m1" | "m2"; day: number }
  | { type: "weak" }
  | { type: "due" }
  /** Alle Themen eines Fachs aus dem Lernplan. */
  | { type: "fach"; planId: "m1" | "m2"; fach: string }
  /** Probeklausur: quer durch den ganzen Plan, ohne Wiederholungen. */
  | { type: "probe"; planId: "m1" | "m2" }

/** Eine Frage im Strom. `key` ist eindeutig und dient als Ausschlussmarke. */
export type KreuzenItem = {
  key: string
  kind: "pool" | "due"
  poolQuestionId: string | null
  savedId: string | null
  topic: string
  difficulty: number
  section: GeneratorSection
  question: BulkQuestion
}

export type KreuzenNextResponse =
  | {
      ok: true
      items: KreuzenItem[]
      /** Warum weniger kam als angefragt — für einen ehrlichen Hinweis statt endlosem Laden. */
      grenze: null | "pool_limit" | "gen_limit" | "keine_themen" | "generierung_fehlgeschlagen" | "kapazitaet"
      quota: { pool: { remaining: number; unlimited: boolean }; gen: { remaining: number; unlimited: boolean } }
      isLoggedIn: boolean
      isPro: boolean
    }
  | { ok: false; error: string }
