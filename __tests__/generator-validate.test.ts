import { describe, it, expect } from "vitest"
import {
  validateGeneratedQuestions,
  questionsHaveExplanations,
} from "../lib/generator-validate"

function makeOptions(correctIndex: number) {
  return Array.from({ length: 5 }, (_, i) => ({
    text: `Option ${i + 1}`,
    isCorrect: i === correctIndex,
    explanation: `Erklärung ${i + 1}`,
  }))
}

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    stem: "Eine Frage?",
    explanation: "Gesamterklärung.",
    learningObjective: "Lernziel.",
    examTrap: "Falle.",
    allowImmediate: true,
    caseVignette: null as string | null,
    options: makeOptions(2),
    ...overrides,
  }
}

describe("validateGeneratedQuestions", () => {
  it("akzeptiert eine gültige Einzelfrage", () => {
    const json = JSON.stringify({ questions: [makeQuestion()] })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(true)
  })

  it("lehnt fehlendes learningObjective ab", () => {
    const json = JSON.stringify({
      questions: [makeQuestion({ learningObjective: "" })],
    })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/learningObjective/)
  })

  it("verlangt genau eine korrekte Antwort", () => {
    const q = makeQuestion()
    q.options[0].isCorrect = true
    q.options[2].isCorrect = true
    const json = JSON.stringify({ questions: [q] })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/genau eine richtige/i)
  })

  it("verlangt exakt 5 Antwortoptionen", () => {
    const q = makeQuestion({ options: makeOptions(0).slice(0, 4) })
    const json = JSON.stringify({ questions: [q] })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/5 Antwortoptionen/)
  })

  it("akzeptiert eine Fallfrage mit 4 Teilfragen und identischer Vignette", () => {
    const vignette = "Ein 65-jähriger Patient stellt sich vor."
    const json = JSON.stringify({
      questions: [
        makeQuestion({ caseVignette: vignette, stem: "Q1" }),
        makeQuestion({ caseVignette: vignette, stem: "Q2" }),
        makeQuestion({ caseVignette: vignette, stem: "Q3" }),
        makeQuestion({ caseVignette: vignette, stem: "Q4" }),
      ],
    })
    const result = validateGeneratedQuestions(json, "case", 4)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.questions).toHaveLength(4)
  })

  it("lehnt Fallfrage mit unterschiedlichen Vignetten ab", () => {
    const json = JSON.stringify({
      questions: [
        makeQuestion({ caseVignette: "Vignette A", stem: "Q1" }),
        makeQuestion({ caseVignette: "Vignette B", stem: "Q2" }),
      ],
    })
    const result = validateGeneratedQuestions(json, "case", 2)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Falltext/i)
  })

  it("lehnt falsche Anzahl ab", () => {
    const json = JSON.stringify({
      questions: [makeQuestion(), makeQuestion()],
    })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Erwartet 1/)
  })
})

describe("questionsHaveExplanations", () => {
  it("erkennt fehlende Gesamterklärung", () => {
    const q = makeQuestion({ explanation: "" })
    expect(questionsHaveExplanations([q as never])).toBe(false)
  })

  it("erkennt fehlende Option-Erklärung", () => {
    const q = makeQuestion()
    q.options[1].explanation = ""
    expect(questionsHaveExplanations([q as never])).toBe(false)
  })

  it("passt bei vollständigen Erklärungen", () => {
    const q = makeQuestion()
    expect(questionsHaveExplanations([q as never])).toBe(true)
  })
})
