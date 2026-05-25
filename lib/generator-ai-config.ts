export const GENERATOR_TOPIC_MAX = 150

/**
 * Generator-Modell – überschreibbar via OPENAI_MODEL_GENERATOR.
 * Standard: gpt-5.4 (unabhängig von OPENAI_MODEL_CONCISE/PRIMARY).
 */
export const GENERATOR_MODEL = process.env.OPENAI_MODEL_GENERATOR || "gpt-5.4"

/** Token-Limit für vollständige Fragen inkl. Erklärungen. */
export function generatorMaxOutputTokens(mode: "single" | "case", caseQuestionCount: number): number {
  if (mode === "single") return 3200
  return 1200 + caseQuestionCount * 2200
}
