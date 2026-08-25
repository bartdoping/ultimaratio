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
}) => Promise<string>

/**
 * Issues, die für sich allein einen (teuren) zusätzlichen Modell-Roundtrip
 * rechtfertigen. Weiche Signale (fehlende Eselsbrücke, dünner High-Yield-Block,
 * fehlende Kernaussage) triggern KEINEN Repair — die UI degradiert graceful.
 * Das ist der zentrale Latenz-Hebel: der Happy Path bleibt bei einem Aufruf.
 */
export function hardSevereIssues(issues: DepthCheckIssue[]): DepthCheckIssue[] {
  const distractorShort = issues.filter((d) => d.kind === "distractor_short")
  return issues.filter((d) => {
    if (d.kind === "total_explanation_short") return true
    if (d.kind === "correct_option_short") return true
    if (d.kind === "must_know_short") return true
    // Einzelner zu knapper Distraktor rechtfertigt keinen Full-Roundtrip;
    // erst ab zwei wird es strukturell relevant.
    if (d.kind === "distractor_short") return distractorShort.length >= 2
    return false
  })
}

/** Issues, die in einen (bereits ausgelösten) Repair-Hint aufgenommen werden. */
function repairableIssues(issues: DepthCheckIssue[]): DepthCheckIssue[] {
  // mnemonic ist bewusst optional — nie in den Repair-Hint.
  return issues.filter((d) => d.kind !== "mnemonic_missing")
}

/**
 * Nachbearbeitung der ERSTEN Stufe (Frage + Optionen, noch ohne Erklärungen).
 *
 * Diese Stufe entscheidet über alles, was der Studierende gleich zu sehen
 * bekommt — Fragestellung, Antwortoptionen, Falltext. Sie muss deshalb
 * vollständig abgeschlossen sein, BEVOR die Frage ausgeliefert wird:
 *
 *  1) Struktur-Validierung (+ 1 Repair bei ungültigem JSON)
 *  2) Spoiler-Prüfung der Teilfragen-Stems bei Fallfragen — ein Stem, der eine
 *     spätere Lösung verrät, ließe sich später nicht mehr korrigieren, ohne
 *     dem Nutzer die Frage unter den Händen wegzuändern.
 *  3) Unabhängiger fachlicher Gegencheck. Läuft bewusst VOR der Anzeige: Wird
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
}): Promise<FinalizeResult> {
  const { mode, expectedCount, repair } = opts
  let jsonText = extractJsonFromModelText(opts.rawText)
  let check = validateGeneratedQuestions(jsonText, mode, expectedCount, "draft")

  if (!check.ok) {
    const repaired = await repair({
      hint: `VALIDIERUNGSFEHLER: ${check.error}`,
      previousJson: jsonText,
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

  // Fachlicher Gegencheck vor der Anzeige.
  if (opts.medicalReview) {
    try {
      const findings = await reviewMedicalAccuracy(check.questions, opts.medicalReview)
      const flagged = findings.filter(hasFindings)

      if (flagged.length > 0) {
        // Gezielt NUR die beanstandeten Teilfragen neu erzeugen, und diese
        // parallel. Der Gutachter beanstandet je Frage unabhängig; einen
        // ganzen Fall mit fünf Teilfragen neu zu schreiben, weil eine davon
        // auffiel, kostete ~35 s statt ~8 s.
        const questions = [...check.questions]
        const results = await Promise.all(
          flagged.map(async (finding) => {
            const idx = finding.questionIndex
            const original = questions[idx]
            if (!original) return null

            // Der Hint nummeriert 1-basiert; hier ist es immer "Frage 1".
            const hint = buildMedicalRepairHint([{ ...finding, questionIndex: 0 }])
            if (!hint) return null

            const repaired = await repair({
              hint,
              previousJson: JSON.stringify({ questions: [original] }),
            })
            const rc = validateGeneratedQuestions(
              extractJsonFromModelText(repaired),
              mode,
              1,
              "draft"
            )
            if (!rc.ok || !rc.questions[0]) return null
            return {
              idx,
              // Der Falltext ist allen Teilfragen gemeinsam und darf durch die
              // Einzelreparatur nicht auseinanderlaufen.
              question: { ...rc.questions[0], caseVignette: original.caseVignette ?? null },
            }
          }).map((p) => p.catch(() => null))
        )

        for (const r of results) {
          if (r) questions[r.idx] = r.question
        }
        check = { ok: true, questions }
      }
    } catch {
      // best-effort — die fachliche Prüfung darf nie zum Fehlschlag führen.
    }
  }

  return { ok: true, questions: check.questions }
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
