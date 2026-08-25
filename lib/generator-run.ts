import type { BulkQuestion } from "@/lib/question-bulk-json"
import {
  buildDraftUserPrompt,
  buildSystemInstructions,
  resolveDifficulties,
} from "@/lib/ai-question-generator-prompt"
import {
  draftMaxOutputTokens,
  enrichMaxOutputTokens,
} from "@/lib/generator-ai-config"
import {
  callGeneratorModelWithRetry,
  callGeneratorRepair,
  callMedicalReviewer,
  streamGeneratorModel,
} from "@/lib/generator-openai"
import { finalizeDraft, type FinalizeResult } from "@/lib/generator-finalize"
import { enrichQuestions, type EnrichResult } from "@/lib/generator-enrich"

/**
 * Gemeinsame Ausführung der zweistufigen Generierung für beide Routen
 * (klassisch und SSE). Die Routen unterscheiden sich nur darin, WANN sie das
 * Zwischenergebnis ausliefern — die Modellaufrufe sind identisch.
 */

export type GeneratorRunContext = {
  topic: string
  difficulty: number
  mode: "single" | "case"
  caseQuestionCount?: number
  difficulties?: number[]
  expectedCount: number
  signal: AbortSignal
}

function promptParams(ctx: GeneratorRunContext) {
  return {
    topic: ctx.topic,
    difficulty: Math.round(ctx.difficulty),
    mode: ctx.mode,
    caseQuestionCount: ctx.mode === "case" ? ctx.caseQuestionCount : undefined,
    difficulties: ctx.mode === "case" ? ctx.difficulties : undefined,
  }
}

/**
 * Stufe 1: Frage, Antwortoptionen und Falltext — vollständig geprüft und
 * fachlich gegengelesen, also bereit zur Anzeige.
 */
export async function runDraftPhase(
  ctx: GeneratorRunContext,
  progress?: {
    /**
     * Fortschritts-Kanal. Wird er übergeben, läuft der Modellaufruf als
     * Stream — ausschließlich, damit der Client einen echten
     * Fortschrittsbalken zeigen kann. Ohne ihn läuft der Aufruf klassisch
     * MIT Modell-Fallback.
     */
    onDelta: (text: string) => void
    /** Feuert, wenn das Modell fertig ist und die Prüfungen beginnen. */
    onVerifying: () => void
  }
): Promise<FinalizeResult> {
  const instructions = buildSystemInstructions()
  const input = buildDraftUserPrompt(promptParams(ctx))

  const callParams = {
    instructions,
    input,
    maxOutputTokens: draftMaxOutputTokens(ctx.mode, ctx.expectedCount),
    signal: ctx.signal,
  }

  const rawText = progress
    ? await streamGeneratorModel(callParams, progress.onDelta)
    : await callGeneratorModelWithRetry(callParams)

  progress?.onVerifying()

  return finalizeDraft({
    rawText,
    mode: ctx.mode,
    expectedCount: ctx.expectedCount,
    repair: (opts) => callGeneratorRepair(callParams, opts),
    medicalReview: (reviewInput) => callMedicalReviewer(reviewInput, ctx.signal),
  })
}

/**
 * Stufe 2: die Erklärungen. Bei Fallfragen laufen die Teilfragen parallel.
 */
export async function runEnrichPhase(
  ctx: GeneratorRunContext,
  draft: BulkQuestion[]
): Promise<EnrichResult> {
  const instructions = buildSystemInstructions()
  const levels = resolveDifficulties(promptParams(ctx))

  return enrichQuestions({
    draft,
    topic: ctx.topic,
    levels,
    call: (input) =>
      callGeneratorModelWithRetry({
        instructions,
        input,
        maxOutputTokens: enrichMaxOutputTokens(),
        signal: ctx.signal,
      }),
  })
}
