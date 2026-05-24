export const GENERATOR_TOPIC_MAX = 150

const MODEL_CONCISE = process.env.OPENAI_MODEL_CONCISE

/**
 * Generator nutzt standardmäßig ein schnelles Modell (nicht gpt-5/PRIMARY).
 * Überschreibbar via OPENAI_MODEL_GENERATOR.
 */
export const GENERATOR_MODEL =
  process.env.OPENAI_MODEL_GENERATOR || MODEL_CONCISE || "gpt-4.1-mini"

/** Token-Limit für vollständige Fragen inkl. Erklärungen. */
export function generatorMaxOutputTokens(mode: "single" | "case", caseQuestionCount: number): number {
  if (mode === "single") return 3200
  return 1200 + caseQuestionCount * 2200
}
