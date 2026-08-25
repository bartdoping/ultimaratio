import { GENERATOR_TOPIC_MAX } from "@/lib/generator-ai-config"
import { isGeneratorSection, type GeneratorSection } from "@/lib/generator-section"

/**
 * Gemeinsames Parsen und Validieren des Generator-Request-Bodys für den
 * klassischen und den Streaming-Endpoint. Vorher war die Logik dupliziert —
 * mit dem Risiko, dass neue Felder nur in einer Route ankommen.
 */

export type ParsedGenerateRequest = {
  topic: string
  difficulty: number
  mode: "single" | "case"
  caseQuestionCount: number
  /** Schwierigkeit je Teilfrage (Fallfragen). Für Einzelfragen leer. */
  difficulties: number[]
  /**
   * Prüfungsabschnitt. "auto" überlässt die Zuordnung dem Modell — das ist
   * die Vorgabe für frei eingegebene Themen. Lernpläne setzen den Wert fest.
   */
  section: GeneratorSection
}

export type ParseResult =
  | { ok: true; value: ParsedGenerateRequest; expectedCount: number }
  | { ok: false; error: string }

function clampLevel(n: unknown, fallback: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(5, Math.max(1, Math.round(v)))
}

export function parseGenerateRequest(body: unknown): ParseResult {
  const b = (body ?? {}) as Record<string, unknown>

  const topic = String(b.topic ?? "").trim().slice(0, GENERATOR_TOPIC_MAX)
  if (!topic || topic.length < 3) {
    return { ok: false, error: "Bitte ein Thema mit mindestens 3 Zeichen angeben." }
  }

  const difficulty = Number(b.difficulty)
  if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
    return { ok: false, error: "Schwierigkeitsgrad muss zwischen 1 und 5 liegen." }
  }

  const mode = b.mode === "case" ? ("case" as const) : ("single" as const)

  // Unbekannte Werte fallen still auf "auto" zurück: Ein Tippfehler im Client
  // soll die Generierung nicht scheitern lassen, sondern nur die Zuordnung
  // wieder dem Modell überlassen.
  const section: GeneratorSection = isGeneratorSection(b.section) ? b.section : "auto"

  if (mode === "single") {
    return {
      ok: true,
      expectedCount: 1,
      value: { topic, difficulty, mode, caseQuestionCount: 1, difficulties: [], section },
    }
  }

  const caseQuestionCount = Number(b.caseQuestionCount)
  if (
    !Number.isInteger(caseQuestionCount) ||
    caseQuestionCount < 2 ||
    caseQuestionCount > 5
  ) {
    return { ok: false, error: "Bei Fallfragen sind 2 bis 5 Teilfragen erforderlich." }
  }

  // Pro Teilfrage eine eigene Stufe. Fehlt der Eintrag, gilt `difficulty`.
  // Bewusst tolerant: ein unvollständiges Array darf die Generierung nicht
  // scheitern lassen, es wird auf die Gesamtschwierigkeit aufgefüllt.
  const raw = Array.isArray(b.difficulties) ? (b.difficulties as unknown[]) : []
  const difficulties = Array.from({ length: caseQuestionCount }, (_, i) =>
    clampLevel(raw[i], Math.round(difficulty))
  )

  return {
    ok: true,
    expectedCount: caseQuestionCount,
    value: { topic, difficulty, mode, caseQuestionCount, difficulties, section },
  }
}
