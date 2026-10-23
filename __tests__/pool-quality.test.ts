import { describe, it, expect } from "vitest"
import { evaluatePoolQuestion, pointBiserial } from "../lib/pool-quality"
import { contentHash, normalizeTopic } from "../lib/pool"

describe("pointBiserial", () => {
  it("ist positiv, wenn Starke häufiger richtig liegen", () => {
    const s = [
      { correct: true, userAccuracy: 0.9 }, { correct: true, userAccuracy: 0.85 },
      { correct: true, userAccuracy: 0.8 }, { correct: false, userAccuracy: 0.4 },
      { correct: false, userAccuracy: 0.35 }, { correct: false, userAccuracy: 0.3 },
    ]
    expect(pointBiserial(s)!).toBeGreaterThan(0.5)
  })

  it("ist negativ, wenn Starke hereinfallen und Schwache nicht — die defekte Frage", () => {
    const s = [
      { correct: false, userAccuracy: 0.9 }, { correct: false, userAccuracy: 0.85 },
      { correct: true, userAccuracy: 0.4 }, { correct: true, userAccuracy: 0.35 },
    ]
    expect(pointBiserial(s)!).toBeLessThan(0)
  })

  it("liefert null ohne Streuung oder ohne beide Gruppen", () => {
    expect(pointBiserial([{ correct: true, userAccuracy: 0.5 }, { correct: true, userAccuracy: 0.7 }])).toBeNull()
    expect(pointBiserial([{ correct: true, userAccuracy: 0.5 }, { correct: false, userAccuracy: 0.5 }])).toBeNull()
    expect(pointBiserial([{ correct: true, userAccuracy: null }])).toBeNull()
  })
})

describe("evaluatePoolQuestion", () => {
  const basis = { answeredCount: 40, correctCount: 20, reportCount: 0, discrimination: 0.3 }

  it("behält eine gesunde Frage", () => {
    expect(evaluatePoolQuestion(basis).retire).toBe(false)
  })

  it("zieht nach drei Meldungen zurück", () => {
    expect(evaluatePoolQuestion({ ...basis, reportCount: 3 }).retire).toBe(true)
  })

  it("zieht bei hoher Meldequote früher zurück", () => {
    expect(evaluatePoolQuestion({ ...basis, answeredCount: 12, reportCount: 2 }).retire).toBe(true)
  })

  it("zieht bei negativer Trennschärfe erst mit genug Antworten zurück", () => {
    expect(evaluatePoolQuestion({ ...basis, discrimination: -0.2 }).retire).toBe(true)
    expect(evaluatePoolQuestion({ ...basis, answeredCount: 15, discrimination: -0.2 }).retire).toBe(false)
  })
})

describe("Pool-Hilfen", () => {
  it("normalisiert Themen für die Suche", () => {
    expect(normalizeTopic("  Lyme-Borreliose ")).toBe("lyme borreliose")
    expect(normalizeTopic("Herzinsuffizienz (HFrEF)")).toBe("herzinsuffizienz hfref")
  })

  it("erkennt dieselbe Frage trotz anderer Optionsreihenfolge", () => {
    const a = { stem: "Frage?", options: ["A", "B", "C"].map((t) => ({ text: t, isCorrect: t === "A" })) }
    const b = { stem: " frage? ", options: ["C", "A", "B"].map((t) => ({ text: t, isCorrect: t === "A" })) }
    expect(contentHash(a)).toBe(contentHash(b))
  })
})
