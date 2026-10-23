/**
 * Qualität von Poolfragen aus echten Antworten.
 *
 * Mit jeder Antwort wird der Pool besser — das ist der Teil des Produkts, den
 * niemand kopieren kann. Zwei klassische Kennzahlen der Testtheorie:
 *
 *  - Lösungsquote (p): Anteil richtiger Antworten. Zeigt, ob die Stufe stimmt.
 *  - Trennschärfe (punktbiseriale Korrelation): Lösen Starke die Frage häufiger
 *    als Schwache? Eine NEGATIVE Trennschärfe heißt: Gute Studierende fallen
 *    darauf herein, schwache nicht — die Frage ist fehlerhaft, mehrdeutig oder
 *    falsch markiert. Solche Fragen fliegen aus dem Pool.
 *
 * Reine Funktionen, ohne Datenbank — prüfbar mit festen Zahlen.
 */

export type AnswerSample = { correct: boolean; userAccuracy: number | null }

/** Punktbiseriale Korrelation zwischen "richtig" und der Stärke des Antwortenden. */
export function pointBiserial(samples: AnswerSample[]): number | null {
  const xs = samples.filter((s) => typeof s.userAccuracy === "number") as {
    correct: boolean
    userAccuracy: number
  }[]
  if (xs.length < 2) return null
  const richtig = xs.filter((s) => s.correct).map((s) => s.userAccuracy)
  const falsch = xs.filter((s) => !s.correct).map((s) => s.userAccuracy)
  if (richtig.length === 0 || falsch.length === 0) return null

  const mittel = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
  const alle = xs.map((s) => s.userAccuracy)
  const m = mittel(alle)
  const sd = Math.sqrt(alle.reduce((s, v) => s + (v - m) ** 2, 0) / alle.length)
  if (sd === 0) return null
  const p = richtig.length / xs.length
  return ((mittel(richtig) - mittel(falsch)) / sd) * Math.sqrt(p * (1 - p))
}

export const QUALITY_RULES = {
  /** Ab so vielen Meldungen wird eine Frage sofort zurückgezogen. */
  MAX_REPORTS: 3,
  /** Anteil Meldungen an Antworten, ab dem auch weniger Meldungen reichen. */
  MAX_REPORT_RATE: 0.1,
  /** Erst ab so vielen Antworten ist die Trennschärfe belastbar. */
  MIN_ANSWERS_FOR_STATS: 30,
  /** Unter diesem Wert führt die Frage Starke in die Irre. */
  MIN_DISCRIMINATION: -0.05,
} as const

export type QualityVerdict = { retire: false } | { retire: true; reason: string }

export function evaluatePoolQuestion(stats: {
  answeredCount: number
  correctCount: number
  reportCount: number
  discrimination: number | null
}): QualityVerdict {
  const R = QUALITY_RULES
  if (stats.reportCount >= R.MAX_REPORTS) {
    return { retire: true, reason: `${stats.reportCount} Meldungen` }
  }
  if (stats.answeredCount >= 10 && stats.reportCount / stats.answeredCount >= R.MAX_REPORT_RATE && stats.reportCount >= 2) {
    return { retire: true, reason: `Meldequote ${Math.round((100 * stats.reportCount) / stats.answeredCount)} %` }
  }
  if (
    stats.answeredCount >= R.MIN_ANSWERS_FOR_STATS &&
    stats.discrimination !== null &&
    stats.discrimination < R.MIN_DISCRIMINATION
  ) {
    return { retire: true, reason: `negative Trennschärfe ${stats.discrimination.toFixed(2)}` }
  }
  return { retire: false }
}
