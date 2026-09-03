import type { BulkQuestion } from "@/lib/question-bulk-json"

/**
 * Wiederholungslogik für gespeicherte Fragen.
 *
 * Bewusst ein einfacher Intervall-Leiter statt SM-2: Der Nutzen für die
 * Prüfungsvorbereitung entsteht fast vollständig daraus, dass falsch
 * beantwortete Fragen überhaupt wiederkommen — nicht daraus, ob das Intervall
 * 6,3 oder 7 Tage beträgt. Die Leiter ist nachvollziehbar, ohne Parameter und
 * ohne Zustand, der kaputtgehen kann.
 *
 * Frei von Datenbank- und Browser-Zugriffen, damit sie prüfbar bleibt.
 */

/** Abstände in Tagen nach n richtigen Antworten in Folge. */
const INTERVALLE_TAGE = [1, 3, 7, 21, 60] as const

export const MS_PRO_TAG = 86_400_000

/**
 * Neuer Lernstand nach einer Antwort.
 *
 * Falsch beantwortet setzt die Serie zurück und legt die Frage auf morgen —
 * genau dieses Verhalten ist der eigentliche Zweck des Speicherns.
 */
export function nextReviewState(
  vorher: { attempts: number; correctCount: number; streak: number },
  korrekt: boolean,
  jetzt: Date = new Date()
): {
  attempts: number
  correctCount: number
  streak: number
  lastAnsweredAt: Date
  lastCorrect: boolean
  dueAt: Date
} {
  const streak = korrekt ? vorher.streak + 1 : 0
  // streak 0 (falsch) → 1 Tag; 1 → 3; 2 → 7; 3 → 21; ab 4 → 60.
  const idx = Math.min(INTERVALLE_TAGE.length - 1, streak)
  const tage = INTERVALLE_TAGE[idx]

  return {
    attempts: vorher.attempts + 1,
    correctCount: vorher.correctCount + (korrekt ? 1 : 0),
    streak,
    lastAnsweredAt: jetzt,
    lastCorrect: korrekt,
    dueAt: new Date(jetzt.getTime() + tage * MS_PRO_TAG),
  }
}

/** Ist die Frage zur Wiederholung fällig? Nie beantwortete gelten nicht als fällig. */
export function istFaellig(dueAt: Date | null | undefined, jetzt: Date = new Date()): boolean {
  if (!dueAt) return false
  return dueAt.getTime() <= jetzt.getTime()
}

/** Trefferquote in Prozent; null, wenn noch nie beantwortet. */
export function trefferquote(attempts: number, correctCount: number): number | null {
  if (attempts <= 0) return null
  return Math.round((correctCount / attempts) * 100)
}

/**
 * Fasst Trefferquoten je Thema zusammen — die Grundlage für
 * "Kardiologie 78 %, Endokrinologie 41 %".
 *
 * Themen ohne Antwort erscheinen nicht: Eine Quote von "0 %" wäre irreführend,
 * wenn schlicht noch nichts beantwortet wurde.
 */
export function themenBilanz(
  zeilen: { topic: string; attempts: number; correctCount: number }[]
): { topic: string; attempts: number; correctCount: number; quote: number }[] {
  const map = new Map<string, { attempts: number; correctCount: number }>()
  for (const z of zeilen) {
    const cur = map.get(z.topic) ?? { attempts: 0, correctCount: 0 }
    cur.attempts += z.attempts
    cur.correctCount += z.correctCount
    map.set(z.topic, cur)
  }
  return [...map.entries()]
    .filter(([, v]) => v.attempts > 0)
    .map(([topic, v]) => ({
      topic,
      attempts: v.attempts,
      correctCount: v.correctCount,
      quote: Math.round((v.correctCount / v.attempts) * 100),
    }))
    .sort((a, b) => a.quote - b.quote || b.attempts - a.attempts)
}

/**
 * Bringt eine gespeicherte Frage zurück in die Form, die der Runner erwartet.
 *
 * Tolerant gegenüber altem oder unvollständigem JSON: Ein einzelner kaputter
 * Datensatz darf die Liste nicht unbrauchbar machen.
 */
export function payloadToQuestion(payload: unknown): BulkQuestion | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  if (typeof p.stem !== "string" || !p.stem.trim()) return null
  if (!Array.isArray(p.options) || p.options.length < 2) return null

  const options = p.options
    .map((o) => {
      const opt = o as Record<string, unknown>
      if (typeof opt?.text !== "string") return null
      return {
        text: opt.text,
        isCorrect: opt.isCorrect === true,
        explanation: typeof opt.explanation === "string" ? opt.explanation : null,
      }
    })
    .filter((o): o is NonNullable<typeof o> => o !== null)

  if (options.length < 2 || options.filter((o) => o.isCorrect).length !== 1) return null

  const str = (v: unknown) => (typeof v === "string" ? v : null)

  return {
    stem: p.stem,
    allowImmediate: true,
    caseVignette: str(p.caseVignette),
    explanation: str(p.explanation),
    keyTakeaway: str(p.keyTakeaway),
    mustKnow: str(p.mustKnow),
    mnemonic: str(p.mnemonic),
    highYield: Array.isArray(p.highYield)
      ? p.highYield.filter((h): h is string => typeof h === "string")
      : null,
    options,
  }
}
