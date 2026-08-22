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
function hardSevereIssues(issues: DepthCheckIssue[]): DepthCheckIssue[] {
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

  return { ok: true, questions: check.questions }
}
