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

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (q.options.length !== 5) {
      return { ok: false, error: `Frage ${i + 1} muss genau 5 Antwortoptionen haben.` }
    }
    const correctCount = q.options.filter((o) => o.isCorrect).length
    if (correctCount !== 1) {
      return {
        ok: false,
        error: `Frage ${i + 1} muss genau eine richtige Antwort haben (erhalten: ${correctCount}).`,
      }
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

export function questionsHaveExplanations(questions: BulkQuestion[]): boolean {
  for (const q of questions) {
    if (!q.explanation?.trim()) return false
    for (const opt of q.options) {
      if (!opt.explanation?.trim()) return false
    }
  }
  return true
}
