import type { BulkQuestion } from "@/lib/question-bulk-json"
import { buildEnrichUserPrompt } from "@/lib/ai-question-generator-prompt"
import {
  buildDepthRepairHint,
  checkExplanationDepth,
} from "@/lib/generator-validate"
import { hardSevereIssues } from "@/lib/generator-finalize"
import type { GeneratorSection } from "@/lib/generator-section"
import {
  buildCaseContext,
  graftExplanations,
  parseEnrichResult,
} from "@/lib/generator-phases"

/**
 * Stufe 2 der Generierung: die Erklärungen zu bereits feststehenden Fragen.
 *
 * Läuft im Hintergrund, während der Studierende die Frage liest — und bei
 * Fallfragen für alle Teilfragen PARALLEL. Gemessen entstanden die 8885 Tokens
 * einer 5er-Fallfrage bisher streng nacheinander (133 s); parallel zählt nur
 * noch der längste Einzelaufruf (~30 s).
 *
 * Die Stufe ist durchgehend best-effort: Scheitert sie für eine Teilfrage,
 * bleibt diese Frage ohne Erklärung erhalten statt die ganze Generierung zu
 * verlieren. Der Aufrufer erfährt über `failedIndices`, welche betroffen sind.
 */

/** Ein einzelner Modellaufruf für die Anreicherung. */
export type EnrichCallFn = (input: string) => Promise<string>

export type EnrichResult = {
  questions: BulkQuestion[]
  /** Indizes, für die keine Erklärung erzeugt werden konnte. */
  failedIndices: number[]
}

async function enrichOne(opts: {
  draft: BulkQuestion[]
  index: number
  topic: string
  level: number
  section: GeneratorSection
  call: EnrichCallFn
}): Promise<BulkQuestion | null> {
  const question = opts.draft[opts.index]

  // Nur die unveränderlichen Felder als Vorlage — Erklärungsfelder wären hier
  // ohnehin leer und würden das Modell nur verwirren.
  const draftJson = JSON.stringify({
    stem: question.stem,
    caseVignette: question.caseVignette ?? null,
    options: question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
  })

  const basePrompt = buildEnrichUserPrompt({
    topic: opts.topic,
    level: opts.level,
    section: opts.section,
    draftJson,
    caseContext: buildCaseContext(opts.draft, opts.index) || undefined,
  })

  const attempt = async (prompt: string) => {
    const raw = await opts.call(prompt)
    return parseEnrichResult(raw, question.options.length)
  }

  let parsed = await attempt(basePrompt)

  // Ein einziger Korrekturversuch bei Formfehlern. Mehr lohnt nicht: Das
  // Modell scheitert an dieser Aufgabe fast nie, und jeder Versuch kostet
  // wieder ~28 s.
  if (!parsed.ok) {
    const hint = [
      `KORREKTUR NÖTIG: ${parsed.error}`,
      `Gib GENAU ${question.options.length} Einträge in "optionExplanations" aus,`,
      "in der Reihenfolge der Optionen der Vorlage. Antworte nur mit dem JSON-Objekt.",
    ].join("\n")
    try {
      parsed = await attempt([basePrompt, "", hint].join("\n"))
    } catch {
      return null
    }
  }
  if (!parsed.ok) return null

  let enriched = graftExplanations(question, parsed.fields)

  // Tiefen-Nachbesserung nur bei harten Defiziten. Der Nutzer liest zu diesem
  // Zeitpunkt bereits die Frage, die zusätzliche Zeit fällt also nicht auf.
  const hard = hardSevereIssues(checkExplanationDepth([enriched]))
  if (hard.length > 0) {
    try {
      const deeper = await attempt(
        [basePrompt, "", buildDepthRepairHint(hard), "", "Antworte nur mit dem JSON-Objekt."].join("\n")
      )
      if (deeper.ok) {
        const candidate = graftExplanations(question, deeper.fields)
        // Nur übernehmen, wenn es tatsächlich besser wurde.
        if (hardSevereIssues(checkExplanationDepth([candidate])).length < hard.length) {
          enriched = candidate
        }
      }
    } catch {
      // best-effort — die vorhandene Erklärung bleibt.
    }
  }

  return enriched
}

export async function enrichQuestions(opts: {
  draft: BulkQuestion[]
  topic: string
  /** Prüfungsabschnitt — die Erklärung folgt demselben Register wie die Frage. */
  section?: GeneratorSection
  /** Effektive Stufe je Frage, gleiche Reihenfolge wie `draft`. */
  levels: number[]
  call: EnrichCallFn
}): Promise<EnrichResult> {
  const results = await Promise.all(
    opts.draft.map((_, i) =>
      enrichOne({
        draft: opts.draft,
        index: i,
        topic: opts.topic,
        section: opts.section ?? "auto",
        level: opts.levels[i] ?? opts.levels[0] ?? 3,
        call: opts.call,
      }).catch(() => null)
    )
  )

  const failedIndices: number[] = []
  const questions = results.map((r, i) => {
    if (r) return r
    failedIndices.push(i)
    return opts.draft[i]
  })

  return { questions, failedIndices }
}
