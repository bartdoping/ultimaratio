import type { BulkQuestion } from "@/lib/question-bulk-json"
import { validateBulkJson } from "@/lib/question-bulk-json"

/**
 * Grenzen für das Aha-Format.
 *
 * Erklärungen sind bewusst kurz: Der Studierende liest sie in 15 Sekunden,
 * oft auf dem Handy. Geprüft wird deshalb in beide Richtungen — zu knapp
 * (kein Argument, bloße Floskel) UND zu lang (ein Absatz, wo ein Satz reicht).
 * Die ausführliche Vertiefung entsteht nur auf Anforderung (lib/deep-dive.ts).
 */
export const QUESTION_QUALITY = {
  /** Aha-Satz: mindestens ein vollständiges Argument … */
  MIN_KEY_TAKEAWAY_CHARS: 25,
  /** … aber höchstens zwei Sätze (~40 Wörter). */
  MAX_KEY_TAKEAWAY_CHARS: 320,
  /** Ein Satz zur richtigen Option — mit konkretem Kriterium. */
  MIN_CORRECT_OPTION_EXPL_CHARS: 30,
  /** Ein Satz pro Distraktor: warum hier falsch — wann richtig. */
  MIN_DISTRACTOR_EXPL_CHARS: 25,
  /** Ein Satz, ~30 Wörter. Darüber ist es ein Absatz. */
  MAX_OPTION_EXPL_CHARS: 260,
  /** Merkregel — konkret, keine Floskel. */
  MIN_MUST_KNOW_CHARS: 25,
  MAX_MUST_KNOW_CHARS: 240,
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

/**
 * Umfang der Prüfung.
 *
 * "draft" prüft die erste Stufe der zweistufigen Generierung: Fragestellung,
 * Antwortoptionen und Falltext stehen fest, die Erklärungen entstehen erst im
 * zweiten Schritt. Alle strukturellen Regeln gelten unverändert — es entfällt
 * ausschließlich die Prüfung der Erklärungsfelder.
 */
export type ValidationPhase = "draft" | "full"

export function validateGeneratedQuestions(
  rawText: string,
  mode: "single" | "case",
  expectedCount: number,
  phase: ValidationPhase = "full"
): { ok: true; questions: BulkQuestion[] } | { ok: false; error: string } {
  // "allowImmediate" ist im Generator immer true — eine UI-Entscheidung, keine
  // Modellaufgabe. Fehlt es, setzen wir es, statt eine sonst einwandfreie
  // Frage in einen teuren Reparatur-Durchlauf zu schicken.
  const validated = validateBulkJson(rawText, { defaultAllowImmediate: true })
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
    if (phase === "draft") {
      // In der Entwurfsstufe ersetzt keyTakeaway das mustKnow als inhaltlicher
      // Substanznachweis: ein Satz, der die richtige Antwort begründet und dem
      // fachlichen Gegencheck als Kontext dient.
      if (!q.keyTakeaway || q.keyTakeaway.trim().length < QUESTION_QUALITY.MIN_KEY_TAKEAWAY_CHARS) {
        return {
          ok: false,
          error: `${where}: "keyTakeaway" fehlt oder ist zu knapp (mindestens ${QUESTION_QUALITY.MIN_KEY_TAKEAWAY_CHARS} Zeichen).`,
        }
      }
      continue
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
    // Pflicht sind Aha-Satz und eine Zeile je Option. Die Vertiefung
    // ("explanation") entsteht nur auf Anforderung und darf fehlen.
    if (!q.keyTakeaway?.trim()) return false
    for (const opt of q.options) {
      if (!opt.explanation?.trim()) return false
    }
  }
  return true
}

export type DepthCheckIssue = {
  questionIndex: number
  kind:
    | "key_takeaway_short"
    | "key_takeaway_long"
    | "correct_option_short"
    | "distractor_short"
    | "option_long"
    | "must_know_short"
    | "must_know_long"
    | "mnemonic_missing"
  detail: string
}

/**
 * Formprüfung des Aha-Formats. Meldet zu Knappes (kein Argument) und zu
 * Langes (Absatz statt Satz). Ob ein Befund eine Nachbesserung auslöst,
 * entscheidet `hardSevereIssues` — nicht jede Abweichung ist einen
 * zusätzlichen Modellaufruf wert.
 */
export function checkExplanationDepth(questions: BulkQuestion[]): DepthCheckIssue[] {
  const Q = QUESTION_QUALITY
  const issues: DepthCheckIssue[] = []
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const kt = (q.keyTakeaway ?? "").trim()
    if (kt.length < Q.MIN_KEY_TAKEAWAY_CHARS) {
      issues.push({ questionIndex: i, kind: "key_takeaway_short", detail: `Aha-Satz fehlt oder ist zu knapp (${kt.length} Zeichen). Ein vollständiges Argument: warum genau diese Lösung.` })
    } else if (kt.length > Q.MAX_KEY_TAKEAWAY_CHARS) {
      issues.push({ questionIndex: i, kind: "key_takeaway_long", detail: `Aha-Satz ist ${kt.length} Zeichen — höchstens 2 Sätze / 40 Wörter. Auf den Kern kürzen.` })
    }

    const mk = (q.mustKnow ?? "").trim()
    if (mk.length < Q.MIN_MUST_KNOW_CHARS) {
      issues.push({ questionIndex: i, kind: "must_know_short", detail: `Merkregel fehlt oder ist zu knapp (${mk.length} Zeichen).` })
    } else if (mk.length > Q.MAX_MUST_KNOW_CHARS) {
      issues.push({ questionIndex: i, kind: "must_know_long", detail: `Merkregel ist ${mk.length} Zeichen — ein Satz, höchstens 25 Wörter.` })
    }

    if (!q.mnemonic || !q.mnemonic.trim()) {
      issues.push({ questionIndex: i, kind: "mnemonic_missing", detail: "Eselsbrücke leer — korrekt, wenn keine starke existiert." })
    }

    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j]
      const txt = (opt.explanation ?? "").trim()
      const b = String.fromCharCode(65 + j)
      const min = opt.isCorrect ? Q.MIN_CORRECT_OPTION_EXPL_CHARS : Q.MIN_DISTRACTOR_EXPL_CHARS
      if (txt.length < min) {
        issues.push({
          questionIndex: i,
          kind: opt.isCorrect ? "correct_option_short" : "distractor_short",
          detail: opt.isCorrect
            ? `Erklärung der richtigen Option ${b} (${txt.length} Zeichen) nennt kein Kriterium. Ein Satz mit dem entscheidenden Argument.`
            : `Erklärung zu Option ${b} (${txt.length} Zeichen) zu knapp. Ein Satz: warum hier falsch — richtig wäre sie bei …`,
        })
      } else if (txt.length > Q.MAX_OPTION_EXPL_CHARS) {
        issues.push({ questionIndex: i, kind: "option_long", detail: `Erklärung zu Option ${b} ist ${txt.length} Zeichen — genau ein Satz, höchstens 30 Wörter.` })
      }
    }
  }
  return issues
}

/** Baut aus Formabweichungen einen kompakten Nachbesserungs-Auftrag. */
export function buildDepthRepairHint(issues: DepthCheckIssue[]): string {
  if (issues.length === 0) return ""
  return [
    "FORM DER ERKLÄRUNGEN: Behebe genau diese Punkte. Antwortoptionen (Text, isCorrect) bleiben unverändert.",
    ...issues.map((it) => `- Frage ${it.questionIndex + 1}: ${it.detail}`),
    "Format: Aha-Satz höchstens 2 Sätze / 40 Wörter; je Option GENAU EIN Satz (höchstens 30 Wörter), bei falschen Optionen \"warum hier falsch — richtig wäre sie bei …\"; Merkregel ein Satz; Vertiefung leer. Antworte ausschließlich mit gültigem JSON.",
  ].join("\n")
}
