import type { BulkQuestion } from "@/lib/question-bulk-json"
import { extractJsonFromModelText } from "@/lib/question-bulk-json"

/**
 * Unabhängiger fachlicher Gegencheck der erzeugten Fragen.
 *
 * Warum das nötig ist: Der Generator produziert mit einer Grundrate fachliche
 * Aussetzer — verunglückte oder erfundene Fachbegriffe ("Serum-Gaben von
 * Glycogen-ähnlichen Peptiden" statt "GLP-1-Spiegel") und Fragen, bei denen die
 * als richtig markierte Option nicht die klinisch etablierte Antwort ist. Ein
 * Modell, das seine eigene Antwort im selben Durchgang prüft, übersieht solche
 * Fehler zuverlässig; ein FRISCHER Kontext ohne Kenntnis des Generator-Prompts
 * findet sie dagegen gut.
 *
 * Wichtige Eigenschaften:
 *  - Es wird nur Stem, Optionen und die Begründung der richtigen Option
 *    geschickt — nicht die kompletten Erklärungstexte. Das hält den Aufruf
 *    klein und schnell.
 *  - Der Check schlägt NIE die Generierung fehl: Findet er nichts oder
 *    scheitert er, bleibt die Frage unverändert (fail-open).
 *  - Abschaltbar über `GENERATOR_MEDICAL_REVIEW=0`.
 */

export type ReviewFinding = {
  questionIndex: number
  /** Ist die markierte Antwort fachlich die beste? */
  answerCorrect: boolean
  /** Wäre auch ein Distraktor vertretbar richtig? */
  ambiguous: boolean
  /** Erfundene oder verunglückte Fachbegriffe. */
  inventedTerms: string[]
  /** Sprachliche Fehler in der medizinischen Fachsprache. */
  languageErrors: string[]
}

export type ReviewFn = (input: string) => Promise<string>

export function medicalReviewEnabled(): boolean {
  const raw = process.env.GENERATOR_MEDICAL_REVIEW?.trim().toLowerCase()
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no")
}

/** Kompakte, prüfbare Darstellung der Fragen für den Gutachter. */
export function buildReviewInput(questions: BulkQuestion[]): string {
  const blocks = questions.map((q, i) => {
    const correct = q.options.find((o) => o.isCorrect)
    const opts = q.options
      .map(
        (o, k) =>
          `  ${String.fromCharCode(65 + k)}) ${o.text}${o.isCorrect ? "   <-- als RICHTIG markiert" : ""}`
      )
      .join("\n")
    return [
      `### Frage ${i + 1}`,
      q.caseVignette ? `Falltext: ${q.caseVignette.slice(0, 900)}` : "",
      `Fragestellung: ${q.stem}`,
      "Antwortoptionen:",
      opts,
      correct?.explanation
        ? `Begründung der markierten Antwort: ${correct.explanation.slice(0, 700)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")
  })

  return [
    "Begutachte die folgenden medizinischen Prüfungsfragen streng.",
    "",
    ...blocks,
    "",
    "Prüfe für JEDE Frage:",
    "1. answerCorrect: Ist die als RICHTIG markierte Option fachlich die klinisch etablierte beste Antwort? false, wenn eine andere Option klar besser wäre.",
    "2. ambiguous: Gibt es unter den nicht markierten Optionen eine, die ein Facharzt ebenfalls für richtig halten könnte? Dann true.",
    "3. inventedTerms: Liste erfundener, verunglückter oder falsch zusammengesetzter Fachbegriffe (z. B. Umschreibungen statt etablierter Termini). Leer, wenn keine.",
    "4. languageErrors: Liste konkreter Fehler der deutschen medizinischen Fachsprache (Deklination, Wortbildung, falscher Terminus). Leer, wenn keine.",
    "",
    "Sei streng, aber melde NUR echte Fehler — keine Stilpräferenzen.",
    "",
    "Antworte ausschließlich mit JSON:",
    '{"questions":[{"index":1,"answerCorrect":true,"ambiguous":false,"inventedTerms":[],"languageErrors":[]}]}',
  ].join("\n")
}

/** Instructions für den Gutachter — bewusst ohne Kenntnis des Generator-Prompts. */
export const MEDICAL_REVIEW_INSTRUCTIONS = [
  "Du bist erfahrener deutscher Facharzt und Prüfungsgutachter.",
  "Du begutachtest medizinische Prüfungsfragen ausschließlich auf fachliche Richtigkeit,",
  "Eindeutigkeit der Lösung und korrekte deutsche medizinische Fachsprache.",
  "Du bist streng, aber meldest nur echte Fehler — keine Geschmacksfragen.",
  "Antworte ausschließlich mit gültigem JSON.",
].join(" ")

/** Parst die Gutachter-Antwort. Bei Unlesbarkeit: keine Beanstandungen. */
export function parseReviewResult(raw: string): ReviewFinding[] {
  let data: unknown
  try {
    data = JSON.parse(extractJsonFromModelText(raw))
  } catch {
    return []
  }
  const arr = (data as { questions?: unknown })?.questions
  if (!Array.isArray(arr)) return []

  const asStrings = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 5)
      : []

  return arr.map((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>
    const idxRaw = Number(e.index)
    return {
      // Der Gutachter zählt ab 1, intern arbeiten wir ab 0.
      questionIndex: Number.isFinite(idxRaw) && idxRaw >= 1 ? Math.floor(idxRaw) - 1 : i,
      answerCorrect: e.answerCorrect !== false,
      ambiguous: e.ambiguous === true,
      inventedTerms: asStrings(e.inventedTerms),
      languageErrors: asStrings(e.languageErrors),
    }
  })
}

/** Beanstandungen, die eine Korrektur rechtfertigen. */
export function hasFindings(f: ReviewFinding): boolean {
  return (
    !f.answerCorrect ||
    f.ambiguous ||
    f.inventedTerms.length > 0 ||
    f.languageErrors.length > 0
  )
}

/**
 * Übersetzt die Beanstandungen in einen Repair-Hinweis. Fachliche Fehler
 * (falsche/mehrdeutige Antwort) erlauben ausdrücklich, Antwortoptionen zu
 * ändern — sonst bliebe der Fehler bestehen. Sprachliche Beanstandungen
 * lassen die Frage inhaltlich unangetastet.
 */
export function buildMedicalRepairHint(findings: ReviewFinding[]): string {
  const relevant = findings.filter(hasFindings)
  if (relevant.length === 0) return ""

  const needsAnswerChange = relevant.some((f) => !f.answerCorrect || f.ambiguous)

  const lines = [
    "FACHLICHE BEANSTANDUNGEN eines unabhängigen Facharzt-Gutachters. Behebe sie vollständig:",
  ]

  for (const f of relevant) {
    const where = `Frage ${f.questionIndex + 1}`
    if (!f.answerCorrect) {
      lines.push(
        `- ${where}: Die als richtig markierte Option ist fachlich NICHT die beste Antwort. Bestimme die klinisch etablierte Standardantwort und markiere ausschließlich diese mit isCorrect: true.`
      )
    }
    if (f.ambiguous) {
      lines.push(
        `- ${where}: Mehrere Optionen sind vertretbar richtig. Schärfe den Stem so nach, dass genau eine Option zutrifft, oder ersetze den mehrdeutigen Distraktor durch einen eindeutig falschen.`
      )
    }
    for (const t of f.inventedTerms) {
      lines.push(
        `- ${where}: Erfundener oder verunglückter Fachbegriff — "${t}". Ersetze ihn durch den etablierten Terminus in korrekter Form.`
      )
    }
    for (const e of f.languageErrors) {
      lines.push(`- ${where}: Sprachlicher Fehler — ${e}`)
    }
  }

  if (needsAnswerChange) {
    lines.push(
      "",
      "AUSNAHME zur sonstigen Regel: Weil eine fachliche Beanstandung vorliegt, DARFST und SOLLST du hier Stem und Antwortoptionen anpassen, soweit zur Behebung nötig. Passe die Erklärungstexte entsprechend an, damit sie zur korrigierten Lösung passen."
    )
  } else {
    lines.push(
      "",
      "Es liegt KEINE fachliche Beanstandung der Lösung vor: Stem, Antwortoptionen und isCorrect bleiben unverändert. Korrigiere ausschließlich die benannten Formulierungen."
    )
  }

  return lines.join("\n")
}

/**
 * Führt den Gegencheck aus. Fail-open: Bei jedem Problem werden keine
 * Beanstandungen gemeldet, damit die Generierung nie an der Prüfung scheitert.
 */
export async function reviewMedicalAccuracy(
  questions: BulkQuestion[],
  review: ReviewFn
): Promise<ReviewFinding[]> {
  if (!medicalReviewEnabled() || questions.length === 0) return []
  try {
    const raw = await review(buildReviewInput(questions))
    return parseReviewResult(raw)
  } catch (err) {
    console.warn("[generator] Fachlicher Gegencheck fehlgeschlagen – Frage bleibt unverändert.", err)
    return []
  }
}
