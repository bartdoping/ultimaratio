export const GENERATOR_TOPIC_MAX = 150

const MODEL_PRIMARY = process.env.OPENAI_MODEL_PRIMARY || "gpt-5"
const MODEL_CONCISE = process.env.OPENAI_MODEL_CONCISE || MODEL_PRIMARY

/** Schnelleres Modell für Generator – per ENV überschreibbar. */
export const GENERATOR_MODEL =
  process.env.OPENAI_MODEL_GENERATOR || MODEL_CONCISE || MODEL_PRIMARY

export function generatorMaxOutputTokens(mode: "single" | "case", caseQuestionCount: number): number {
  if (mode === "single") return 1400
  return 900 + caseQuestionCount * 1100
}

export function generatorExplanationMaxOutputTokens(questionCount: number): number {
  return 800 + questionCount * 900
}
