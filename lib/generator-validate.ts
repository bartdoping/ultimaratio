import type { BulkQuestion } from "@/lib/question-bulk-json"
import { validateBulkJson } from "@/lib/question-bulk-json"

export function validateGeneratedQuestions(
  rawText: string,
  mode: "single" | "case",
  expectedCount: number
): { ok: true; questions: BulkQuestion[] } | { ok: false; error: string } {
  const validated = validateBulkJson(rawText)
  if (!validated.ok) {
    return { ok: false, error: validated.error }
  }

  const { questions } = validated.payload

  if (questions.length !== expectedCount) {
    return {
      ok: false,
      error: `Erwartet ${expectedCount} Frage(n), erhalten ${questions.length}.`,
    }
  }

  for (const q of questions) {
    if (q.options.length !== 5) {
      return { ok: false, error: "Jede Frage muss genau 5 Antwortoptionen haben." }
    }
  }

  if (mode === "case") {
    const vignette = questions[0]?.caseVignette?.trim()
    if (!vignette) {
      return { ok: false, error: "Fallfrage ohne Falltext." }
    }
    const allSame = questions.every((q) => (q.caseVignette ?? "").trim() === vignette)
    if (!allSame) {
      return { ok: false, error: "Falltext der Teilfragen ist nicht einheitlich." }
    }
  } else if (questions.some((q) => q.caseVignette?.trim())) {
    return { ok: false, error: "Einzelfrage enthält unerwarteten Falltext." }
  }

  return { ok: true, questions }
}

export function mergeQuestionExplanations(
  base: BulkQuestion[],
  explanationPayload: BulkQuestion[]
): BulkQuestion[] {
  if (base.length !== explanationPayload.length) return base

  return base.map((q, i) => {
    const patch = explanationPayload[i]
    if (!patch) return q
    return {
      ...q,
      explanation: patch.explanation ?? q.explanation ?? null,
      options: q.options.map((opt, j) => ({
        ...opt,
        explanation: patch.options[j]?.explanation ?? opt.explanation ?? null,
      })),
    }
  })
}

export function validateExplanationPatch(
  rawText: string,
  expectedCount: number
): { ok: true; questions: BulkQuestion[] } | { ok: false; error: string } {
  const validated = validateBulkJson(rawText)
  if (!validated.ok) {
    return { ok: false, error: validated.error }
  }

  if (validated.payload.questions.length !== expectedCount) {
    return {
      ok: false,
      error: `Erwartet ${expectedCount} Erklärungsblock/-blöcke, erhalten ${validated.payload.questions.length}.`,
    }
  }

  for (const q of validated.payload.questions) {
    if (q.options.length !== 5) {
      return { ok: false, error: "Erklärungsblock: jede Frage braucht 5 Optionen." }
    }
  }

  return { ok: true, questions: validated.payload.questions }
}
