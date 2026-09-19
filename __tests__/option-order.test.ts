import { describe, it, expect } from "vitest"
import { canShuffle, shuffleAll, shuffleOptions } from "../lib/option-order"
import type { BulkQuestion } from "../lib/question-bulk-json"

const frage = (texte: string[], richtig = 0, stem = "Welche Maßnahme ist indiziert?"): BulkQuestion => ({
  stem,
  allowImmediate: true,
  options: texte.map((text, i) => ({ text, isCorrect: i === richtig })),
})

const FUENF = ["Nitroglycerin", "Dobutamin", "Furosemid", "Morphin", "Noradrenalin"]

/** Deterministischer PRNG (Mulberry32) für Verteilungsprüfungen. */
function prng(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

describe("shuffleOptions", () => {
  it("behält alle Optionen und genau eine richtige", () => {
    const q = shuffleOptions(frage(FUENF, 0), prng(1))
    expect(q.options.map((o) => o.text).sort()).toEqual([...FUENF].sort())
    expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1)
    // Die richtige ist weiterhin Nitroglycerin — nur ihr Platz ändert sich.
    expect(q.options.find((o) => o.isCorrect)!.text).toBe("Nitroglycerin")
  })

  it("verteilt die richtige Antwort annähernd gleich über A–E", () => {
    const rand = prng(42)
    const zaehler = [0, 0, 0, 0, 0]
    for (let i = 0; i < 5000; i++) {
      const q = shuffleOptions(frage(FUENF, 0), rand)
      zaehler[q.options.findIndex((o) => o.isCorrect)]++
    }
    // Erwartung je Position: 1000 (20 %). Toleranz ±10 % relativ.
    for (const n of zaehler) {
      expect(n).toBeGreaterThan(900)
      expect(n).toBeLessThan(1100)
    }
  })

  it("verändert das Original nicht", () => {
    const q = frage(FUENF, 0)
    shuffleOptions(q, prng(3))
    expect(q.options.map((o) => o.text)).toEqual(FUENF)
  })
})

describe("canShuffle — positionsabhängige Optionen bleiben stehen", () => {
  it("mischt nicht bei 'Alle genannten'", () => {
    expect(canShuffle(frage(["a", "b", "c", "d", "Alle genannten Maßnahmen"]))).toBe(false)
  })

  it("mischt nicht bei 'Keine der genannten'", () => {
    expect(canShuffle(frage(["a", "b", "c", "d", "Keine der genannten"]))).toBe(false)
  })

  it("mischt nicht bei 'A und B'", () => {
    expect(canShuffle(frage(["a", "b", "c", "d", "A und B sind richtig"]))).toBe(false)
  })

  it("mischt nicht, wenn die Fragestellung eine Option per Buchstaben nennt", () => {
    expect(canShuffle(frage(FUENF, 0, "Warum ist Option C hier falsch?"))).toBe(false)
  })

  it("mischt gewöhnliche Optionen", () => {
    expect(canShuffle(frage(FUENF))).toBe(true)
  })

  it("lässt nicht mischbare Fragen unverändert", () => {
    const q = frage(["a", "b", "c", "d", "Alle genannten"], 4)
    expect(shuffleOptions(q, prng(9))).toBe(q)
  })
})

describe("shuffleAll", () => {
  it("mischt jede Teilfrage einer Fallfrage unabhängig", () => {
    const qs = [frage(FUENF, 0), frage(FUENF, 0), frage(FUENF, 0)]
    const r = shuffleAll(qs, prng(7))
    expect(r).toHaveLength(3)
    r.forEach((q) => expect(q.options.find((o) => o.isCorrect)!.text).toBe("Nitroglycerin"))
  })
})
