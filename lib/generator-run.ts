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
  callOptionExclusionCheck,
  GeneratorModelError,
  streamGeneratorModel,
} from "@/lib/generator-openai"
import type { GeneratorSection } from "@/lib/generator-section"
import { withAiUser } from "@/lib/ai-usage"
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
  /** Prüfungsabschnitt; "auto" überlässt die Zuordnung dem Modell. */
  section?: GeneratorSection
  expectedCount: number
  signal: AbortSignal
  /** Für die Kostenzuordnung (lib/ai-usage.ts); bei anonymen Besuchern leer. */
  userId?: string | null
}

function promptParams(ctx: GeneratorRunContext) {
  return {
    topic: ctx.topic,
    difficulty: Math.round(ctx.difficulty),
    mode: ctx.mode,
    caseQuestionCount: ctx.mode === "case" ? ctx.caseQuestionCount : undefined,
    difficulties: ctx.mode === "case" ? ctx.difficulties : undefined,
    section: ctx.section ?? "auto",
  }
}

/**
 * Stufe 1: Frage, Antwortoptionen und Falltext — vollständig geprüft und
 * fachlich gegengelesen, also bereit zur Anzeige.
 */
async function runDraftPhaseInner(
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
    purpose: "draft" as const,
  }

  let rawText: string
  if (progress) {
    try {
      rawText = await streamGeneratorModel(callParams, progress.onDelta)
    } catch (err) {
      // Ein Abbruch (Timeout, Client weg) ist endgültig — nicht neu versuchen.
      if (ctx.signal.aborted || (err as { name?: string })?.name === "AbortError") throw err
      // Fehlendes Guthaben oder ungültiger Schlüssel: Ein zweiter Versuch
      // scheitert garantiert und kostet nur Zeit.
      if (err instanceof GeneratorModelError && (err.kind === "quota" || err.kind === "auth")) throw err

      // Der Streaming-Aufruf kennt selbst keinen Modell-Fallback. Fällt das
      // Primärmodell aus, wiederholen wir OHNE Stream: `callGeneratorModelWithRetry`
      // bringt Retry und Ersatzmodell mit. Der Nutzer verliert dabei nur den
      // Fortschrittsbalken, nicht die Frage — vorher war das ein harter Fehler.
      console.warn(
        `[generator] Streaming fehlgeschlagen (${
          err instanceof Error ? err.message : "unbekannt"
        }) — erneuter Versuch ohne Stream.`
      )
      rawText = await callGeneratorModelWithRetry(callParams)
    }
  } else {
    rawText = await callGeneratorModelWithRetry(callParams)
  }

  progress?.onVerifying()

  return finalizeDraft({
    rawText,
    mode: ctx.mode,
    expectedCount: ctx.expectedCount,
    topic: ctx.topic,
    repair: (opts) =>
      callGeneratorRepair({ ...callParams, signal: begrenzt(ctx.signal, REPAIR_TIMEOUT_MS) }, opts),
    medicalReview: (reviewInput) =>
      callMedicalReviewer(reviewInput, begrenzt(ctx.signal, CHECK_TIMEOUT_MS)),
    exclusionCheck: (input) =>
      callOptionExclusionCheck(input, begrenzt(ctx.signal, CHECK_TIMEOUT_MS)),
  })
}

/**
 * Obergrenzen für die Aufrufe NACH dem Entwurf.
 *
 * Die Prüfungen und Nachbesserungen sind fehlertolerant — scheitern sie, bleibt
 * die Frage unverändert. Sie waren aber nicht ZEITtolerant: In der Messung hing
 * ein einzelner Aufruf 240 s und hielt die fertige Frage so lange zurück, weil
 * nur das Gesamt-Timeout griff. Ein Prüfer, der nicht antwortet, soll die Frage
 * nicht blockieren; nach der Grenze gilt er als gescheitert und die Frage geht
 * unverändert weiter.
 */
const CHECK_TIMEOUT_MS = 25_000
const REPAIR_TIMEOUT_MS = 40_000

function begrenzt(signal: AbortSignal, ms: number): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(ms)])
}

/**
 * Stufe 2: die Erklärungen. Bei Fallfragen laufen die Teilfragen parallel.
 */
async function runEnrichPhaseInner(
  ctx: GeneratorRunContext,
  draft: BulkQuestion[]
): Promise<EnrichResult> {
  const instructions = buildSystemInstructions()
  const levels = resolveDifficulties(promptParams(ctx))

  return enrichQuestions({
    draft,
    topic: ctx.topic,
    section: ctx.section ?? "auto",
    levels,
    call: (input) =>
      callGeneratorModelWithRetry({
        instructions,
        input,
        maxOutputTokens: enrichMaxOutputTokens(),
        signal: ctx.signal,
        purpose: "enrich",
      }),
  })
}


/**
 * Stufe 1, mit Kostenzuordnung zum Nutzer. Alle KI-Aufrufe innerhalb
 * (Entwurf, Prüfungen, Nachbesserungen) werden ihm zugerechnet.
 */
export function runDraftPhase(
  ctx: GeneratorRunContext,
  progress?: Parameters<typeof runDraftPhaseInner>[1]
): Promise<FinalizeResult> {
  return withAiUser(ctx.userId, () => runDraftPhaseInner(ctx, progress))
}

/** Stufe 2, mit Kostenzuordnung zum Nutzer. */
export function runEnrichPhase(ctx: GeneratorRunContext, draft: BulkQuestion[]): Promise<EnrichResult> {
  return withAiUser(ctx.userId, () => runEnrichPhaseInner(ctx, draft))
}
