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

/**
 * Sekundärmodell, das verwendet wird, wenn das primäre Modell ausfällt
 * (z. B. Timeout, 5xx, Rate-Limit nach Retry). Über
 * `OPENAI_MODEL_GENERATOR_FALLBACK` konfigurierbar.
 *
 * Default ist bewusst `gpt-4o-mini` — robust verfügbar und niemals derselbe wie
 * das Primärmodell, wenn das Primärmodell überschrieben wurde.
 */
const FALLBACK_SECONDARY = "gpt-4o-mini"
const FALLBACK_CONFIGURED =
  process.env.OPENAI_MODEL_GENERATOR_FALLBACK?.trim() || FALLBACK_SECONDARY

export const GENERATOR_MODEL_FALLBACK =
  FALLBACK_CONFIGURED === GENERATOR_MODEL
    ? // Wenn primary == fallback, bringt der Fallback nichts → gpt-4o nehmen.
      "gpt-4o"
    : FALLBACK_CONFIGURED

/** Token-Limit für vollständige Fragen inkl. Erklärungen. */
export function generatorMaxOutputTokens(mode: "single" | "case", caseQuestionCount: number): number {
  if (mode === "single") return 3200
  return 1200 + caseQuestionCount * 2200
}
