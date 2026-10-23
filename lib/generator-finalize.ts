import type { BulkQuestion } from "@/lib/question-bulk-json"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"
import {
  buildDepthRepairHint,
  checkExplanationDepth,
  questionsHaveExplanations,
  validateGeneratedQuestions,
  type DepthCheckIssue,
} from "@/lib/generator-validate"
import { buildSpoilerRepairHint, detectSpoilers } from "@/lib/spoiler-detection"
import { buildCueRepairHint, detectOptionCues, needsQuestionRework } from "@/lib/option-cues"
import { shuffleAll } from "@/lib/option-order"
import {
  buildExclusionInput,
  buildExclusionRepairHint,
  needsOptionRework,
  optionCheckEnabled,
  parseExclusionResult,
  type ExclusionFn,
  type ExclusionResult,
} from "@/lib/option-exclusion-check"
import type { RepairScope } from "@/lib/generator-openai"
import {
  buildMedicalRepairHint,
  hasFindings,
  reviewMedicalAccuracy,
  type ReviewFn,
} from "@/lib/generator-medical-review"

/**
 * Wie viele geteilte Begriffe zwischen zwei Teilfragen als Spoiler-Verdacht
 * gelten, solange nur der Entwurf vorliegt (siehe `detectSpoilers`).
 *
 * Empirisch bestimmt an vier echten Fallentwürfen: Jeder dort gefundene
 * Treffer bestand aus GENAU EINEM generischen Wort — "allein", "verabreichen",
 * "unverzüglich", "elektive". Kein einziger war ein Fachbegriff und keiner ein
 * echter Spoiler. Jeder hätte einen Reparatur-Durchlauf von ~40 s ausgelöst.
 * Zwei unabhängig geteilte Begriffe sind dagegen ein belastbares Signal.
 */
const DRAFT_MIN_SHARED_SPOILER_TERMS = 2

export type FinalizeResult =
  | { ok: true; questions: BulkQuestion[] }
  | { ok: false; error: string; status: number }

/**
 * Repair-Aufruf: bekommt den Mangel-Hinweis UND die zuvor erzeugte JSON-Antwort.
 * Nur so kann das Modell dieselbe Frage überarbeiten, statt eine neue zu
 * erfinden (siehe `callGeneratorRepair`).
 */
export type RepairFn = (opts: {
  hint: string
  previousJson: string
  /** Was die Nachbesserung ändern darf — siehe `RepairScope`. Vorgabe: nur Erklärungen. */
  scope?: RepairScope
}) => Promise<string>

/**
 * Issues, die für sich allein einen (teuren) zusätzlichen Modell-Roundtrip
 * rechtfertigen. Weiche Signale (fehlende Eselsbrücke, dünner High-Yield-Block,
 * fehlende Kernaussage) triggern KEINEN Repair — die UI degradiert graceful.
 * Das ist der zentrale Latenz-Hebel: der Happy Path bleibt bei einem Aufruf.
 */
export function hardSevereIssues(issues: DepthCheckIssue[]): DepthCheckIssue[] {
  // Eine Nachbesserung kostet einen ganzen Modellaufruf. Ausgelöst wird sie
  // nur, wenn die Erklärung als Ganzes nicht trägt: fehlender Aha-Satz,
  // fehlendes Argument zur richtigen Option, mehrere leere Distraktoren —
  // oder wenn die Kürze systematisch verfehlt wurde (Aha-Satz zu lang bzw.
  // mindestens drei Options-Erklärungen sind Absätze).
  const anzahl = (k: DepthCheckIssue["kind"]) => issues.filter((d) => d.kind === k).length
  return issues.filter((d) => {
    switch (d.kind) {
      case "key_takeaway_short":
      case "key_takeaway_long":
      case "correct_option_short":
        return true
      case "distractor_short":
        return anzahl("distractor_short") >= 2
      case "option_long":
        return anzahl("option_long") >= 3
      default:
        return false
    }
  })
}

/** Issues, die in einen (bereits ausgelösten) Repair-Hint aufgenommen werden. */
function repairableIssues(issues: DepthCheckIssue[]): DepthCheckIssue[] {
  // mnemonic ist bewusst optional — nie in den Repair-Hint.
  return issues.filter((d) => d.kind !== "mnemonic_missing")
}

/**
 * Führt den Ausschluss-Check je Frage parallel aus. Fail-open: Ohne Funktion,
 * bei abgeschalteter Prüfung oder bei einem Fehler ist das Ergebnis null.
 */
async function runExclusionChecks(
  questions: BulkQuestion[],
  check: ExclusionFn | undefined
): Promise<(ExclusionResult | null)[]> {
  if (!check || !optionCheckEnabled()) return questions.map(() => null)
  return Promise.all(
    questions.map(async (q) => {
      try {
        const { input, zuordnung } = buildExclusionInput(q)
        return parseExclusionResult(await check(input), zuordnung)
      } catch (err) {
        console.warn("[generator] Ausschluss-Check fehlgeschlagen – Frage bleibt unverändert.", err)
        return null
      }
    })
  )
}

/** Steht die richtige Antwort in jeder Frage noch an derselben Stelle? */
function sameCorrectPositions(a: BulkQuestion[], b: BulkQuestion[]): boolean {
  if (a.length !== b.length) return false
  return a.every((q, i) => {
    const ia = q.options.findIndex((o) => o.isCorrect)
    const ib = b[i].options.findIndex((o) => o.isCorrect)
    return ia === ib && q.options.length === b[i].options.length
  })
}

/**
 * Nachbearbeitung der ERSTEN Stufe (Frage + Optionen, noch ohne Erklärungen).
 *
 * Diese Stufe entscheidet über alles, was der Studierende gleich zu sehen
 * bekommt — Fragestellung, Antwortoptionen, Falltext. Sie muss deshalb
 * vollständig abgeschlossen sein, BEVOR die Frage ausgeliefert wird:
 *
 *  1) Struktur-Validierung (+ 1 Repair bei ungültigem JSON)
 *  2) Formale Lösungshinweise in den Antwortoptionen (siehe lib/option-cues.ts):
 *     Ist die richtige Antwort an Länge, Begründungen, Dringlichkeitswörtern
 *     oder Absicherungen erkennbar, werden die Optionen angeglichen — nur hier
 *     ist das möglich, danach sieht der Nutzer sie.
 *  3) Spoiler-Prüfung der Teilfragen-Stems bei Fallfragen — ein Stem, der eine
 *     spätere Lösung verrät, ließe sich später nicht mehr korrigieren, ohne
 *     dem Nutzer die Frage unter den Händen wegzuändern.
 *  4) Unabhängiger fachlicher Gegencheck. Läuft bewusst VOR der Anzeige: Wird
 *     die als richtig markierte Antwort beanstandet, muss das korrigiert sein,
 *     bevor jemand die Frage liest.
 *
 * Die Erklärungs-Tiefenprüfung entfällt hier — es gibt noch keine Erklärungen.
 * Sie findet in Stufe 2 statt (siehe `lib/generator-enrich.ts`).
 */
export async function finalizeDraft(opts: {
  rawText: string
  mode: "single" | "case"
  expectedCount: number
  repair: RepairFn
  medicalReview?: ReviewFn
  /** Thema der Generierung — für die Erkennung eines Themenechos in der richtigen Antwort. */
  topic?: string
  /**
   * Optionaler Ausschluss-Check: liest nur die Optionen und nennt, was sich
   * ohne Fachwissen streichen lässt (siehe lib/option-exclusion-check.ts).
   */
  exclusionCheck?: ExclusionFn
  /** Zufallsquelle für die Reihenfolge der Optionen — nur für Tests überschrieben. */
  rand?: () => number
}): Promise<FinalizeResult> {
  const { mode, expectedCount, repair } = opts
  let jsonText = extractJsonFromModelText(opts.rawText)
  let check = validateGeneratedQuestions(jsonText, mode, expectedCount, "draft")

  if (!check.ok) {
    const repaired = await repair({
      hint: `VALIDIERUNGSFEHLER: ${check.error}`,
      previousJson: jsonText,
      scope: "draft",
    })
    jsonText = extractJsonFromModelText(repaired)
    check = validateGeneratedQuestions(jsonText, mode, expectedCount, "draft")
  }

  if (!check.ok) {
    return {
      ok: false,
      error: `KI-Antwort ungültig: ${check.error} Bitte erneut generieren.`,
      status: 502,
    }
  }

  // Formale Lösungshinweise — nur die betroffenen Teilfragen, parallel.
  // Läuft vor Spoiler-Prüfung und Gegencheck, damit beide die endgültig
  // formulierten Optionen sehen.
  {
    const questions = [...check.questions]
    const betroffen = [...new Set(detectOptionCues(questions, opts.topic).map((c) => c.questionIndex))]
    if (betroffen.length > 0) {
      const results = await Promise.all(
        betroffen.map(async (idx) => {
          const original = questions[idx]
          const vorher = detectOptionCues([original], opts.topic)
          // Ein Themenecho verlangt eine umgestellte Frage, alles andere nur
          // angeglichene Formulierungen der Optionen.
          const umbau = needsQuestionRework(vorher)
          const repaired = await repair({
            hint: buildCueRepairHint(vorher),
            previousJson: JSON.stringify({ questions: [original] }),
            scope: umbau ? "draft" : "options",
          })
          const rc = validateGeneratedQuestions(extractJsonFromModelText(repaired), mode, 1, "draft")
          if (!rc.ok || !rc.questions[0]) return null
          const neu = { ...rc.questions[0], caseVignette: original.caseVignette ?? null }
          // Nur übernehmen, was tatsächlich weniger verrät — und bei reinen
          // Formulierungskorrekturen die richtige Antwort an ihrem Platz lässt.
          if (!umbau && !sameCorrectPositions([original], [neu])) return null
          if (detectOptionCues([neu], opts.topic).length >= vorher.length) return null
          return { idx, question: neu }
        }).map((pr) => pr.catch(() => null))
      )
      for (const r of results) {
        if (r) questions[r.idx] = r.question
      }
      check = { ok: true, questions }
    }
  }

  // Spoiler zwischen den Teilfragen-Stems. Höhere Schwelle als beim vollen
  // Text: Ohne Erklärungen ist ein einzelnes geteiltes Wort kein Beleg, und
  // ein Reparatur-Durchlauf kostet hier ~40 s.
  if (mode === "case") {
    const hits = detectSpoilers(check.questions, { minSharedTerms: DRAFT_MIN_SHARED_SPOILER_TERMS })
    if (hits.length > 0) {
      try {
        const repaired = await repair({
          hint: buildSpoilerRepairHint(hits),
          previousJson: JSON.stringify({ questions: check.questions }),
          scope: "draft",
        })
        const recheck = validateGeneratedQuestions(
          extractJsonFromModelText(repaired),
          mode,
          expectedCount,
          "draft"
        )
        const after = recheck.ok
          ? detectSpoilers(recheck.questions, { minSharedTerms: DRAFT_MIN_SHARED_SPOILER_TERMS })
          : []
        if (recheck.ok && after.length <= hits.length / 2) {
          check = recheck
        }
      } catch {
        // best-effort
      }
    }
  }

  // Fachlicher Gegencheck und Ausschluss-Check — gleichzeitig.
  //
  // Beide lesen denselben Entwurf und sind voneinander unabhängig; parallel
  // verlängern sie die Wartezeit nicht über den langsameren der beiden hinaus.
  // Je Teilfrage folgt höchstens EINE Nachbesserung: Hat sie einen fachlichen
  // Befund, gehen beide Befunde in denselben Auftrag.
  try {
    const questions = [...check.questions]
    const [findings, ausschluss] = await Promise.all([
      opts.medicalReview
        ? reviewMedicalAccuracy(questions, opts.medicalReview)
        : Promise.resolve([]),
      runExclusionChecks(questions, opts.exclusionCheck),
    ])

    const fachlich = new Map(findings.filter(hasFindings).map((f) => [f.questionIndex, f]))
    const auftraege = questions
      .map((q, idx) => {
        const befund = fachlich.get(idx)
        const ex = ausschluss[idx]
        const formlich = ex && needsOptionRework(q, ex) ? ex : null
        if (!befund && !formlich) return null
        return { idx, befund, formlich }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)

    if (auftraege.length > 0) {
      const results = await Promise.all(
        auftraege.map(async ({ idx, befund, formlich }) => {
          const original = questions[idx]
          // Die Hinweise zählen 1-basiert; die Einzelfrage ist immer "Frage 1".
          const teile = [
            befund ? buildMedicalRepairHint([{ ...befund, questionIndex: 0 }]) : "",
            formlich ? buildExclusionRepairHint(original, formlich) : "",
          ].filter(Boolean)
          if (teile.length === 0) return null

          const repaired = await repair({
            hint: teile.join("\n\n"),
            previousJson: JSON.stringify({ questions: [original] }),
            // Ein fachlicher Befund darf die richtige Antwort ändern, ein
            // reiner Form-Befund nur die Formulierung der Optionen.
            scope: befund ? "draft" : "options",
          })
          const rc = validateGeneratedQuestions(extractJsonFromModelText(repaired), mode, 1, "draft")
          if (!rc.ok || !rc.questions[0]) return null
          // Der Falltext ist allen Teilfragen gemeinsam und darf durch die
          // Einzelreparatur nicht auseinanderlaufen.
          const neu = { ...rc.questions[0], caseVignette: original.caseVignette ?? null }

          if (!befund) {
            // Reine Form-Nachbesserung: Die richtige Antwort bleibt, wo sie
            // war, und es dürfen keine neuen Wortmuster-Hinweise entstehen.
            if (!sameCorrectPositions([original], [neu])) return null
            if (detectOptionCues([neu], opts.topic).length > detectOptionCues([original], opts.topic).length) return null
          }
          return { idx, question: neu }
        }).map((pr) => pr.catch(() => null))
      )

      for (const r of results) {
        if (r) questions[r.idx] = r.question
      }
      check = { ok: true, questions }
    }
  } catch {
    // best-effort — die Prüfungen dürfen nie zum Fehlschlag führen.
  }

  // Reihenfolge mischen — erst jetzt, nach allen Prüfungen, und bevor die
  // Erklärungen entstehen (siehe lib/option-order.ts). Das Modell setzte die
  // richtige Antwort sonst fast nie auf D oder E.
  return { ok: true, questions: shuffleAll(check.questions, opts.rand) }
}

/**
 * Gemeinsame Nachbearbeitung von KI-Rohtext für klassischen und Streaming-Pfad:
 *  1) Struktur-Validierung (+ 1 Repair bei ungültigem JSON / fehlenden Erklärungen)
 *  2) Konservativer Tiefen-Repair (nur bei harten Defiziten)
 *  3) Spoiler-Repair für Fallfragen
 *
 * Alle Repair-Pässe sind best-effort: schlägt einer fehl, wird das jeweils
 * beste bisherige Ergebnis behalten.
 */
export async function finalizeGenerated(opts: {
  rawText: string
  mode: "single" | "case"
  expectedCount: number
  repair: RepairFn
  /**
   * Optionaler unabhängiger Facharzt-Gegencheck. Fehlt er, entfällt die
   * fachliche Prüfung — die übrigen Schritte laufen unverändert.
   */
  medicalReview?: ReviewFn
}): Promise<FinalizeResult> {
  const { mode, expectedCount, repair } = opts
  let jsonText = extractJsonFromModelText(opts.rawText)
  let check = validateGeneratedQuestions(jsonText, mode, expectedCount)

  // 1) Struktur-Repair bei ungültigem JSON oder fehlenden Erklärungen.
  if (!check.ok || !questionsHaveExplanations(check.ok ? check.questions : [])) {
    const hint = !check.ok
      ? `VALIDIERUNGSFEHLER: ${check.error}`
      : "VALIDIERUNGSFEHLER: Erklärungen fehlen. Alle explanation-Felder müssen ausgefüllt sein."
    const repaired = await repair({ hint, previousJson: jsonText })
    jsonText = extractJsonFromModelText(repaired)
    check = validateGeneratedQuestions(jsonText, mode, expectedCount)
  }

  if (!check.ok) {
    return {
      ok: false,
      error: `KI-Antwort ungültig: ${check.error} Bitte erneut generieren.`,
      status: 502,
    }
  }
  if (!questionsHaveExplanations(check.questions)) {
    return {
      ok: false,
      error: "KI-Antwort unvollständig: Erklärungen fehlen. Bitte erneut generieren.",
      status: 502,
    }
  }

  // 2) Tiefen-Repair — nur bei HARTEN Defiziten (Latenzschutz).
  {
    const depthIssues = checkExplanationDepth(check.questions)
    const hard = hardSevereIssues(depthIssues)
    if (hard.length > 0) {
      try {
        const repaired = await repair({
          hint: buildDepthRepairHint(repairableIssues(depthIssues)),
          previousJson: JSON.stringify({ questions: check.questions }),
        })
        const repairedJson = extractJsonFromModelText(repaired)
        const recheck = validateGeneratedQuestions(repairedJson, mode, expectedCount)
        if (recheck.ok && questionsHaveExplanations(recheck.questions)) {
          const newHard = hardSevereIssues(checkExplanationDepth(recheck.questions))
          if (newHard.length < hard.length) {
            check = recheck
          }
        }
      } catch {
        // Repair best-effort — Original behalten.
      }
    }
  }

  // 3) Spoiler-Repair für Fallfragen.
  if (mode === "case") {
    const hits = detectSpoilers(check.questions)
    if (hits.length > 0) {
      try {
        const repaired = await repair({
          hint: buildSpoilerRepairHint(hits),
          previousJson: JSON.stringify({ questions: check.questions }),
          scope: "draft",
        })
        const repairedJson = extractJsonFromModelText(repaired)
        const recheck = validateGeneratedQuestions(repairedJson, mode, expectedCount)
        if (
          recheck.ok &&
          questionsHaveExplanations(recheck.questions) &&
          detectSpoilers(recheck.questions).length <= hits.length / 2
        ) {
          check = recheck
        }
      } catch {
        // best-effort
      }
    }
  }

  // 4) Unabhängiger fachlicher Gegencheck.
  //
  // Läuft zuletzt, damit er die final formulierte Frage sieht. Findet der
  // Gutachter etwas, wird gezielt nachgebessert; der Repair darf hier
  // ausnahmsweise auch Antwortoptionen ändern, weil ein fachlicher Fehler
  // sonst bestehen bliebe. Schlägt der Check fehl, bleibt die Frage
  // unverändert — er darf die Generierung nie blockieren.
  if (opts.medicalReview) {
    try {
      const findings = await reviewMedicalAccuracy(check.questions, opts.medicalReview)
      const hint = buildMedicalRepairHint(findings)
      if (hint) {
        const repaired = await repair({
          hint,
          previousJson: JSON.stringify({ questions: check.questions }),
        })
        const recheck = validateGeneratedQuestions(
          extractJsonFromModelText(repaired),
          mode,
          expectedCount
        )
        if (recheck.ok && questionsHaveExplanations(recheck.questions)) {
          // Korrektur nur übernehmen, wenn sie die Tiefe nicht verschlechtert.
          const before = hardSevereIssues(checkExplanationDepth(check.questions)).length
          const after = hardSevereIssues(checkExplanationDepth(recheck.questions)).length
          if (after <= before) {
            check = recheck
          }
        }
      }
    } catch {
      // best-effort — fachliche Prüfung darf nie zum Fehlschlag führen.
    }
  }

  return { ok: true, questions: check.questions }
}

/** Für Tests: meldet, ob eine Beanstandung eine Korrektur auslösen würde. */
export { hasFindings }
