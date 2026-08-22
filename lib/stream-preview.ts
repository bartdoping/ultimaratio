/**
 * Fortschritts-Erkennung für den gestreamten Generator.
 *
 * BEWUSST OHNE INHALTS-VORSCHAU: Früher wurde die entstehende Frage live
 * angezeigt. Das war irreführend, weil nach dem Stream noch Qualitäts-Repairs
 * laufen können, die Texte verändern — die fertige Frage wich dann von der
 * Vorschau ab. Wir werten den Stream deshalb nur noch aus, um zu erkennen, in
 * welcher Phase die Generierung steckt, und zeigen ausschließlich ein
 * generisches Label. So kann keine Diskrepanz zum Endergebnis entstehen.
 */

export type GenerationPhase =
  | "start"
  | "stem"
  | "options"
  | "explanations"
  | "polishing"
  | "verifying"

/**
 * Leitet die Phase aus dem bisher empfangenen Rohtext ab. Rein heuristisch
 * anhand der JSON-Schlüssel, die bereits aufgetaucht sind — tolerant gegenüber
 * abgeschnittenem JSON und wirft nie.
 */
export function detectGenerationPhase(full: string): GenerationPhase {
  if (!full) return "start"
  if (full.includes('"highYield"') || full.includes('"mustKnow"')) return "polishing"
  if (full.includes('"explanation"') || full.includes('"keyTakeaway"')) return "explanations"
  if (full.includes('"text"')) return "options"
  if (full.includes('"stem"')) return "stem"
  return "start"
}

/** Grober Fortschritt 0–95 % anhand der empfangenen Zeichen. */
export function estimateProgress(chars: number, expectedChars: number): number {
  if (expectedChars <= 0) return 0
  return Math.min(95, Math.round((chars / expectedChars) * 95))
}

export const PHASE_LABEL: Record<GenerationPhase, string> = {
  start: "Frage wird konstruiert…",
  stem: "Fragestellung entsteht…",
  options: "Antwortoptionen entstehen…",
  explanations: "Erklärungen werden geschrieben…",
  polishing: "Lern-Transfer & Merkhilfen…",
  verifying: "Qualitätsprüfung…",
}
