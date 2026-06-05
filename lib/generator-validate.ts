import type { BulkQuestion } from "@/lib/question-bulk-json"
import { validateBulkJson } from "@/lib/question-bulk-json"

/**
 * Mindest-Anforderungen an die inhaltliche Tiefe der KI-Antwort.
 *
 * Diese Schwellen erzwingen, dass das Modell substanziell erklärt — kurze
 * Ein-Satz-Erklärungen sind ein häufiger Defekt billiger LLM-Antworten.
 *
 * Die Schwellen sind großzügig genug, damit gut formulierte Antworten nicht
 * zufällig durchfallen, aber streng genug, um echte Knappheit zu blockieren.
 */
export const QUESTION_QUALITY = {
  /** Gesamterklärung in Zeichen — sollte 3 Sinn-Abschnitte abdecken. */
  MIN_TOTAL_EXPLANATION_CHARS: 420,
  /** Erklärung der richtigen Option — Mechanismus + Algorithmus + Falle. */
  MIN_CORRECT_OPTION_EXPL_CHARS: 220,
  /** Erklärung jeder falschen Option — warum nicht + wann wäre richtig. */
  MIN_DISTRACTOR_EXPL_CHARS: 140,
  /**
   * Must-Know — sehr konkret, nicht generisch. 1–2 Sätze, aber ≥ 40 Zeichen
   * fordert echte Substanz.
   */
  MIN_MUST_KNOW_CHARS: 40,
  /** Fallvignette für Case-Mode — substanzieller Kontext, kein Einzeiler. */
  MIN_CASE_VIGNETTE_CHARS: 180,
} as const

const ANTI_GENERIC_MUST_KNOW_PHRASES = [
  /verständnis (von|der|des) /i,
  /^(verstehen|kennen|wissen)\b/i,
  /^einf(ü|ue)hrung\b/i,
]

function tooGenericMustKnow(value: string): boolean {
  const v = value.trim()
  if (v.length < QUESTION_QUALITY.MIN_MUST_KNOW_CHARS) return true
  return ANTI_GENERIC_MUST_KNOW_PHRASES.some((re) => re.test(v))
}

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
    const where = `Frage ${i + 1}`

    if (q.options.length !== 5) {
      return { ok: false, error: `${where} muss genau 5 Antwortoptionen haben.` }
    }
    const correctCount = q.options.filter((o) => o.isCorrect).length
    if (correctCount !== 1) {
      return {
        ok: false,
        error: `${where} muss genau eine richtige Antwort haben (erhalten: ${correctCount}).`,
      }
    }
    if (!q.mustKnow || !q.mustKnow.trim()) {
      return { ok: false, error: `${where}: "mustKnow" fehlt.` }
    }
    if (tooGenericMustKnow(q.mustKnow)) {
      return {
        ok: false,
        error: `${where}: "mustKnow" ist zu generisch oder zu kurz (mindestens ${QUESTION_QUALITY.MIN_MUST_KNOW_CHARS} Zeichen, keine Floskel wie "Verständnis von …").`,
      }
    }
  }

  if (mode === "case") {
    const vignette = questions[0]?.caseVignette?.trim() ?? ""
    if (!vignette) {
      return { ok: false, error: "Fallfrage ohne Falltext." }
    }
    if (vignette.length < QUESTION_QUALITY.MIN_CASE_VIGNETTE_CHARS) {
      return {
        ok: false,
        error: `Fallvignette zu knapp (mindestens ${QUESTION_QUALITY.MIN_CASE_VIGNETTE_CHARS} Zeichen). Erweitere klinischen Kontext substanziell, ohne spätere Lösung zu spoilern.`,
      }
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

/**
 * Prüft, ob jede Frage strukturierte Erklärungen UND ausreichende Tiefe hat.
 * Wird im API-Pfad gegen Min-Längen geprüft; bei Verstoß löst der Generator
 * einen Repair-Pass mit gezielten Hinweisen aus.
 */
export function questionsHaveExplanations(questions: BulkQuestion[]): boolean {
  for (const q of questions) {
    if (!q.explanation?.trim()) return false
    for (const opt of q.options) {
      if (!opt.explanation?.trim()) return false
    }
  }
  return true
}

export type DepthCheckIssue = {
  questionIndex: number
  kind:
    | "total_explanation_short"
    | "correct_option_short"
    | "distractor_short"
    | "must_know_short"
    | "mnemonic_missing"
  detail: string
}

/**
 * Tiefencheck. Wird NACH dem strukturellen Validate aufgerufen; meldet
 * konkrete Stellen, an denen das Modell zu knapp war. Bei Treffern triggert
 * der API-Pfad einen gezielten Repair-Pass mit den Mängeln im Hint.
 */
export function checkExplanationDepth(questions: BulkQuestion[]): DepthCheckIssue[] {
  const issues: DepthCheckIssue[] = []
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const total = (q.explanation ?? "").trim()
    if (total.length < QUESTION_QUALITY.MIN_TOTAL_EXPLANATION_CHARS) {
      issues.push({
        questionIndex: i,
        kind: "total_explanation_short",
        detail: `Gesamterklärung ist ${total.length} Zeichen, mindestens ${QUESTION_QUALITY.MIN_TOTAL_EXPLANATION_CHARS} nötig. Drei-Abschnitts-Struktur (Pathophysiologie / Algorithmus / Take-Home) verlangt mehr Substanz.`,
      })
    }
    const mk = (q.mustKnow ?? "").trim()
    if (mk.length < QUESTION_QUALITY.MIN_MUST_KNOW_CHARS) {
      issues.push({
        questionIndex: i,
        kind: "must_know_short",
        detail: `Must-Know zu knapp/generisch (${mk.length} Zeichen). 1–2 prägnante Sätze mit dem konkreten Kerndetail — z. B. "Bei … gilt Cut-Off X, weil …".`,
      })
    }
    // mnemonic ist explizit OPTIONAL: nichts erfinden ist besser als
    // schwache Eselsbrücken. Wir merken es nur als Sub-Issue an und nehmen
    // es NICHT in den harten Repair-Pass.
    if (!q.mnemonic || !q.mnemonic.trim()) {
      issues.push({
        questionIndex: i,
        kind: "mnemonic_missing",
        detail: "mnemonic leer — falls keine wirklich starke Eselsbrücke existiert, ist Leerlassen korrekt.",
      })
    }

    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j]
      const txt = (opt.explanation ?? "").trim()
      if (opt.isCorrect) {
        if (txt.length < QUESTION_QUALITY.MIN_CORRECT_OPTION_EXPL_CHARS) {
          issues.push({
            questionIndex: i,
            kind: "correct_option_short",
            detail: `Erklärung der korrekten Option ist ${txt.length} Zeichen; gebraucht sind ≥${QUESTION_QUALITY.MIN_CORRECT_OPTION_EXPL_CHARS} mit Mechanismus + Algorithmus + Cut-Off/Leitlinie + Falle.`,
          })
        }
      } else {
        if (txt.length < QUESTION_QUALITY.MIN_DISTRACTOR_EXPL_CHARS) {
          issues.push({
            questionIndex: i,
            kind: "distractor_short",
            detail: `Distraktor-Erklärung Option ${String.fromCharCode(65 + j)} ist ${txt.length} Zeichen; gebraucht sind ≥${QUESTION_QUALITY.MIN_DISTRACTOR_EXPL_CHARS}: warum hier falsch + wann wäre diese Option richtig + Verwechslungsfalle.`,
          })
        }
      }
    }
  }
  return issues
}

/** Baut aus Tiefendefiziten einen kompakten Repair-Hint für die Folge-Generierung. */
export function buildDepthRepairHint(issues: DepthCheckIssue[]): string {
  if (issues.length === 0) return ""
  const head =
    "TIEFEN-DEFIZIT: Die Erklärungen sind zu knapp. Gib eine vollständig überarbeitete JSON-Antwort zurück, die die folgenden Punkte konkret behebt — Inhalt der Antwortoptionen (Text, isCorrect) bleibt strukturell gleich, die Erklärungstexte werden substanziell vertieft:"
  const bullets = issues.map((it) => {
    const where = `Frage ${it.questionIndex + 1}`
    return `- ${where}: ${it.detail}`
  })
  bullets.push(
    "Die Drei-Abschnitts-Struktur in der Gesamterklärung (Pathophysiologie \\n\\n klinischer Algorithmus \\n\\n Take-Home-Pearl) und die Mindest-Satz-Anzahl pro Option (richtig ≥4 Sätze, falsch ≥3 Sätze) sind verpflichtend. Antworte ausschließlich mit gültigem JSON."
  )
  return [head, ...bullets].join("\n")
}
