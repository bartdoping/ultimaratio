import type { BulkQuestion } from "@/lib/question-bulk-json"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"

/**
 * Zweistufige Generierung.
 *
 * Stufe 1 ("draft") erzeugt Fragestellung, Antwortoptionen und Falltext —
 * gemessen 160 von 2129 Output-Tokens, also 8 % der Arbeit. Stufe 2 ("enrich")
 * erzeugt die Erklärungen, die der Studierende erst NACH dem Antworten sieht.
 *
 * Der Sinn: Stufe 2 läuft, während der Nutzer die Frage liest. Aus 33 Sekunden
 * Wartezeit werden ~8 Sekunden, ohne dass an der Tiefe der Erklärungen etwas
 * eingespart wird.
 *
 * Bei Fallfragen läuft Stufe 2 je Teilfrage PARALLEL. Die 8885 Tokens einer
 * 5er-Fallfrage entstanden bisher streng nacheinander (133 s); parallel zählt
 * nur noch der längste Einzelaufruf.
 */

/** Antwortform der Anreicherungs-Stufe für genau eine Frage. */
export type EnrichedFields = {
  keyTakeaway: string
  explanation: string
  mustKnow: string
  highYield: string[]
  mnemonic: string
  optionExplanations: string[]
}

/**
 * Liest die Antwort der Anreicherungs-Stufe.
 *
 * Tolerant gegenüber Nebensächlichkeiten (fehlendes mnemonic, Zahl statt
 * String), aber strikt bei allem, was die Anzeige bräche: Es MÜSSEN so viele
 * Options-Erklärungen zurückkommen, wie die Frage Optionen hat.
 */
export function parseEnrichResult(
  rawText: string,
  optionCount: number
): { ok: true; fields: EnrichedFields } | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(extractJsonFromModelText(rawText))
  } catch {
    return { ok: false, error: "Erklärungen: ungültiges JSON." }
  }

  const root = data as { questions?: unknown }
  // Das Modell darf sowohl { questions: [ {...} ] } als auch das nackte Objekt
  // liefern — beides kommt in der Praxis vor.
  const entry = Array.isArray(root?.questions)
    ? (root.questions[0] as Record<string, unknown> | undefined)
    : (data as Record<string, unknown> | undefined)

  if (!entry || typeof entry !== "object") {
    return { ok: false, error: "Erklärungen: unerwartete Struktur." }
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")

  const rawOpts = entry.optionExplanations
  if (!Array.isArray(rawOpts)) {
    return { ok: false, error: 'Erklärungen: "optionExplanations" fehlt.' }
  }
  const optionExplanations = rawOpts.map(str)
  if (optionExplanations.length !== optionCount) {
    return {
      ok: false,
      error: `Erklärungen: ${optionExplanations.length} Options-Erklärungen erhalten, ${optionCount} erwartet.`,
    }
  }
  if (optionExplanations.some((e) => !e)) {
    return { ok: false, error: "Erklärungen: mindestens eine Options-Erklärung ist leer." }
  }

  const explanation = str(entry.explanation)
  if (!explanation) {
    return { ok: false, error: 'Erklärungen: "explanation" fehlt.' }
  }

  const highYield = Array.isArray(entry.highYield)
    ? entry.highYield.map(str).filter(Boolean)
    : []

  return {
    ok: true,
    fields: {
      keyTakeaway: str(entry.keyTakeaway),
      explanation,
      mustKnow: str(entry.mustKnow),
      highYield,
      mnemonic: str(entry.mnemonic),
      optionExplanations,
    },
  }
}

/**
 * Pflanzt die Erklärungen an die feststehende Frage.
 *
 * ZENTRALE SICHERHEITSGARANTIE dieser Architektur: Fragestellung,
 * Antwortoptionen, deren Reihenfolge und die Markierung der richtigen Antwort
 * werden aus dem Entwurf übernommen — NIEMALS aus der Anreicherung. Der Nutzer
 * sieht die Frage bereits, während Stufe 2 noch läuft; könnte Stufe 2 sie
 * verändern, wäre exakt der Anzeigefehler zurück, wegen dem die Live-Vorschau
 * entfernt wurde. Der Prompt verbietet die Änderung ohnehin — hier ist sie
 * zusätzlich strukturell unmöglich.
 *
 * `keyTakeaway` bleibt beim Entwurfswert, wenn die Anreicherung keinen liefert:
 * Der Entwurf hat bereits einen, und der fachliche Gegencheck hat auf ihm geurteilt.
 */
export function graftExplanations(draft: BulkQuestion, fields: EnrichedFields): BulkQuestion {
  return {
    ...draft,
    keyTakeaway: fields.keyTakeaway || draft.keyTakeaway || null,
    explanation: fields.explanation,
    mustKnow: fields.mustKnow || draft.mustKnow || null,
    highYield: fields.highYield.length > 0 ? fields.highYield : (draft.highYield ?? null),
    mnemonic: fields.mnemonic || null,
    options: draft.options.map((opt, i) => ({
      text: opt.text,
      isCorrect: opt.isCorrect,
      explanation: fields.optionExplanations[i] ?? opt.explanation ?? null,
    })),
  }
}

/**
 * Beschreibt einer Teilfrage ihren Platz im Fall, damit die Erklärung die
 * Lösung späterer Teilfragen nicht vorwegnimmt. Für Einzelfragen leer.
 */
export function buildCaseContext(questions: BulkQuestion[], targetIndex: number): string {
  if (questions.length < 2) return ""
  const lines = questions.map((q, i) => {
    const marker = i === targetIndex ? "   <-- DIESE Teilfrage erklärst du" : ""
    return `  Teilfrage ${i + 1}: ${q.stem}${marker}`
  })
  return [
    "FALLKONTEXT — Reihenfolge der Teilfragen (nur zur Spoiler-Vermeidung):",
    ...lines,
    "",
    "Deine Erklärung darf die Lösung, Diagnose oder das entscheidende Befundmuster",
    "SPÄTERER Teilfragen nicht vorwegnehmen. Auf frühere Teilfragen darfst du dich beziehen.",
  ].join("\n")
}
