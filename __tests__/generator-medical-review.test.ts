import { describe, it, expect, afterEach } from "vitest"
import {
  buildMedicalRepairHint,
  buildReviewInput,
  hasFindings,
  medicalReviewEnabled,
  parseReviewResult,
  reviewMedicalAccuracy,
  type ReviewFinding,
} from "../lib/generator-medical-review"
import type { BulkQuestion } from "../lib/question-bulk-json"

function q(overrides: Partial<BulkQuestion> = {}): BulkQuestion {
  return {
    stem: "Welcher Test dient dem Screening auf exokrine Pankreasinsuffizienz?",
    explanation: "…",
    allowImmediate: true,
    caseVignette: null,
    options: [
      { text: "Fäkale Elastase-1", isCorrect: false, explanation: "…" },
      { text: "Sekretin-Stimulationstest", isCorrect: true, explanation: "Goldstandard." },
      { text: "Serum-Amylase", isCorrect: false, explanation: "…" },
      { text: "C-Peptid", isCorrect: false, explanation: "…" },
      { text: "Glukagon-Test", isCorrect: false, explanation: "…" },
    ],
    ...overrides,
  } as BulkQuestion
}

const finding = (o: Partial<ReviewFinding> = {}): ReviewFinding => ({
  questionIndex: 0,
  answerCorrect: true,
  ambiguous: false,
  inventedTerms: [],
  languageErrors: [],
  ...o,
})

afterEach(() => {
  delete process.env.GENERATOR_MEDICAL_REVIEW
})

describe("medicalReviewEnabled", () => {
  it("ist standardmäßig aktiv", () => {
    expect(medicalReviewEnabled()).toBe(true)
  })
  it("lässt sich abschalten", () => {
    for (const v of ["0", "false", "off", "no"]) {
      process.env.GENERATOR_MEDICAL_REVIEW = v
      expect(medicalReviewEnabled()).toBe(false)
    }
  })
})

describe("buildReviewInput", () => {
  it("markiert die als richtig gekennzeichnete Option", () => {
    const input = buildReviewInput([q()])
    expect(input).toMatch(/Sekretin-Stimulationstest\s+<-- als RICHTIG markiert/)
  })

  it("schickt die langen Erklärungstexte NICHT mit (Kosten/Tempo)", () => {
    const long = "X".repeat(5000)
    const input = buildReviewInput([q({ explanation: long })])
    expect(input).not.toContain(long)
  })

  it("nimmt den Falltext bei Fallfragen auf", () => {
    const input = buildReviewInput([q({ caseVignette: "Ein 54-jähriger Patient…" })])
    expect(input).toMatch(/Falltext: Ein 54-jähriger Patient/)
  })
})

describe("parseReviewResult", () => {
  it("rechnet den 1-basierten Index des Gutachters auf 0-basiert um", () => {
    const r = parseReviewResult('{"questions":[{"index":3,"answerCorrect":false}]}')
    expect(r[0].questionIndex).toBe(2)
  })

  it("wertet fehlende Felder als unbeanstandet", () => {
    const r = parseReviewResult('{"questions":[{"index":1}]}')
    expect(hasFindings(r[0])).toBe(false)
  })

  it("liefert bei kaputtem JSON keine Beanstandungen statt zu werfen", () => {
    expect(parseReviewResult("kein json")).toEqual([])
    expect(parseReviewResult("")).toEqual([])
  })
})

describe("buildMedicalRepairHint", () => {
  it("ist leer, wenn nichts beanstandet wurde", () => {
    expect(buildMedicalRepairHint([finding()])).toBe("")
  })

  it("erlaubt bei falscher Antwort ausdrücklich das Ändern der Optionen", () => {
    const hint = buildMedicalRepairHint([finding({ answerCorrect: false })])
    expect(hint).toMatch(/klinisch etablierte Standardantwort/)
    expect(hint).toMatch(/DARFST und SOLLST du hier Stem und Antwortoptionen anpassen/)
  })

  it("verbietet bei reinen Sprachmängeln jede inhaltliche Änderung", () => {
    const hint = buildMedicalRepairHint([
      finding({ languageErrors: ["'Hemiblockierung' statt 'Hemiblock'"] }),
    ])
    expect(hint).toMatch(/Hemiblockierung/)
    expect(hint).toMatch(/bleiben unverändert/)
    expect(hint).not.toMatch(/DARFST und SOLLST/)
  })

  it("benennt erfundene Fachbegriffe konkret", () => {
    const hint = buildMedicalRepairHint([
      finding({ inventedTerms: ["Serum-Gaben von Glycogen-ähnlichen Peptiden"] }),
    ])
    expect(hint).toMatch(/Serum-Gaben von Glycogen-ähnlichen Peptiden/)
    expect(hint).toMatch(/etablierten Terminus/)
  })

  it("behandelt Mehrdeutigkeit als inhaltliche Beanstandung", () => {
    const hint = buildMedicalRepairHint([finding({ ambiguous: true })])
    expect(hint).toMatch(/genau eine Option zutrifft/)
    expect(hint).toMatch(/DARFST und SOLLST/)
  })
})

describe("reviewMedicalAccuracy — fail-open", () => {
  it("meldet nichts, wenn der Gutachter einen Fehler wirft", async () => {
    const r = await reviewMedicalAccuracy([q()], async () => {
      throw new Error("Netzwerkfehler")
    })
    expect(r).toEqual([])
  })

  it("meldet nichts, wenn der Check abgeschaltet ist", async () => {
    process.env.GENERATOR_MEDICAL_REVIEW = "0"
    let called = false
    const r = await reviewMedicalAccuracy([q()], async () => {
      called = true
      return "{}"
    })
    expect(called).toBe(false)
    expect(r).toEqual([])
  })

  it("reicht echte Beanstandungen durch", async () => {
    const r = await reviewMedicalAccuracy([q()], async () =>
      '{"questions":[{"index":1,"answerCorrect":false,"ambiguous":true,"inventedTerms":[],"languageErrors":[]}]}'
    )
    expect(r).toHaveLength(1)
    expect(hasFindings(r[0])).toBe(true)
    expect(r[0].answerCorrect).toBe(false)
  })
})
