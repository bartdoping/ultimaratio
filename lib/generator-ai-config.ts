export const GENERATOR_TOPIC_MAX = 150

/**
 * Generator-Modell.
 *
 * Standard ist `gpt-4o-mini` — ein sicher verfügbares, kostengünstiges
 * OpenAI-Responses-API-Modell. Über `OPENAI_MODEL_GENERATOR` lässt sich
 * jederzeit ein anderes Modell setzen (z. B. `gpt-4o`, `gpt-4.1`, ein neueres
 * Generationen-Modell), ohne dass der Code geändert werden muss.
 *
 * Wichtig: Falls hier ein nicht existierendes Modell konfiguriert wird,
 * schlägt die Generierung mit einem klaren Fehler aus der API fehl
 * (siehe `lib/generator-openai.ts`, dort wird der Fehler in eine
 * nutzerfreundliche Server-Antwort übersetzt).
 */
const FALLBACK_MODEL = "gpt-4o-mini"

export const GENERATOR_MODEL = (
  process.env.OPENAI_MODEL_GENERATOR?.trim() || FALLBACK_MODEL
)

/** Token-Limit für vollständige Fragen inkl. Erklärungen. */
export function generatorMaxOutputTokens(mode: "single" | "case", caseQuestionCount: number): number {
  if (mode === "single") return 3200
  return 1200 + caseQuestionCount * 2200
}
