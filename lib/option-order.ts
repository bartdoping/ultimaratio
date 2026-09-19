import type { BulkQuestion } from "@/lib/question-bulk-json"

/**
 * Zufällige Reihenfolge der Antwortoptionen.
 *
 * Gemessen an 29 generierten Fragen stand die richtige Antwort 14× auf A,
 * 9× auf B, 6× auf C und NIE auf D oder E — obwohl der Prompt Gleichverteilung
 * verlangt. Wer das Muster kennt, rät mit "nie D oder E" schon bei einem
 * Drittel statt einem Fünftel richtig. Eine Anweisung, die das Modell
 * nachweislich ignoriert, ist kein Schutz; Mischen im Code schon.
 *
 * Gemischt wird nach allen Prüfungen der Entwurfsstufe und VOR der
 * Erklärungsstufe — die Erklärungen entstehen damit bereits für die
 * endgültige Reihenfolge und passen positionsgenau.
 */

/**
 * Optionen, deren Sinn von ihrer Position abhängt, dürfen nicht gemischt
 * werden: "Alle genannten", "Keine der genannten", "A und B", "beide …".
 * Ebenso nicht, wenn Fragestellung oder Kernaussage eine Option per
 * Buchstaben nennen.
 */
const POSITIONSABHAENGIG =
  /\b(?:alle(?:\s+\p{L}+)?\s+genannten|keine\s+der\s+(?:genannten|obigen)|beide\s+(?:genannten|obigen)|[A-E]\s+und\s+[A-E]|obige[nrs]?)\b/iu

const BUCHSTABENVERWEIS = /\b(?:Option|Antwort|Antwortmöglichkeit)\s+[A-E]\b/u

export function canShuffle(q: BulkQuestion): boolean {
  if (q.options.some((o) => POSITIONSABHAENGIG.test(o.text))) return false
  if (BUCHSTABENVERWEIS.test(q.stem)) return false
  if (q.keyTakeaway && BUCHSTABENVERWEIS.test(q.keyTakeaway)) return false
  return true
}

/** Fisher-Yates. `rand` ist injizierbar, damit Tests deterministisch bleiben. */
export function shuffleOptions(q: BulkQuestion, rand: () => number = Math.random): BulkQuestion {
  if (!canShuffle(q)) return q
  const options = [...q.options]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { ...q, options }
}

export function shuffleAll(
  questions: BulkQuestion[],
  rand: () => number = Math.random
): BulkQuestion[] {
  return questions.map((q) => shuffleOptions(q, rand))
}
