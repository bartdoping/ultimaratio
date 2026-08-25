import { describe, it, expect } from "vitest"
import { enrichQuestions } from "../lib/generator-enrich"
import type { BulkQuestion } from "../lib/question-bulk-json"

function frage(stem: string): BulkQuestion {
  return {
    stem,
    allowImmediate: true,
    caseVignette: null,
    keyTakeaway: "Eine hinreichend lange Kernaussage aus dem Entwurf.",
    options: Array.from({ length: 5 }, (_, i) => ({
      text: `Option ${String.fromCharCode(65 + i)}`,
      isCorrect: i === 0,
    })),
  }
}

/**
 * Antwort mit Texten oberhalb aller Tiefen-Schwellen aus QUESTION_QUALITY —
 * sonst löst der Tiefen-Repass einen zusätzlichen Modellaufruf aus und die
 * Aufruf-Zählungen unten stimmen nicht mehr. Die Erklärung der richtigen
 * Option braucht ≥ 220 Zeichen, die Gesamterklärung ≥ 420.
 */
function antwort(marker: string): string {
  const lang = (n: number) => `${marker} `.repeat(n).trim()
  return JSON.stringify({
    questions: [
      {
        keyTakeaway: lang(6),
        explanation: [lang(40), lang(40), lang(40)].join("\n\n"),
        mustKnow: lang(12),
        highYield: [lang(6), lang(6)],
        mnemonic: "",
        optionExplanations: Array.from({ length: 5 }, () => lang(45)),
      },
    ],
  })
}

describe("enrichQuestions", () => {
  it("ruft das Modell einmal je Teilfrage auf", async () => {
    let aufrufe = 0
    const r = await enrichQuestions({
      draft: [frage("A?"), frage("B?"), frage("C?")],
      topic: "Sepsis",
      levels: [3, 4, 5],
      call: async () => {
        aufrufe++
        return antwort("Inhalt")
      },
    })
    expect(aufrufe).toBe(3)
    expect(r.failedIndices).toEqual([])
    expect(r.questions).toHaveLength(3)
  })

  it("startet die Teilfragen parallel statt nacheinander", async () => {
    let gleichzeitig = 0
    let maxGleichzeitig = 0
    const r = await enrichQuestions({
      draft: [frage("A?"), frage("B?"), frage("C?"), frage("D?")],
      topic: "Polytrauma",
      levels: [4, 4, 4, 4],
      call: async () => {
        gleichzeitig++
        maxGleichzeitig = Math.max(maxGleichzeitig, gleichzeitig)
        await new Promise((res) => setTimeout(res, 20))
        gleichzeitig--
        return antwort("Inhalt")
      },
    })
    // Sequenziell wäre das Maximum 1 — genau das war der Grund für 133 s
    // Wartezeit bei einer Fallfrage mit fünf Teilfragen.
    expect(maxGleichzeitig).toBe(4)
    expect(r.failedIndices).toEqual([])
  })

  it("behält die Frage, wenn die Erklärung dauerhaft scheitert", async () => {
    const draft = [frage("A?")]
    const r = await enrichQuestions({
      draft,
      topic: "COPD",
      levels: [3],
      call: async () => {
        throw new Error("API weg")
      },
    })
    expect(r.failedIndices).toEqual([0])
    // Die Frage bleibt vollständig nutzbar — nur ohne Erklärung.
    expect(r.questions[0].stem).toBe("A?")
    expect(r.questions[0].options).toHaveLength(5)
  })

  it("meldet nur die tatsächlich gescheiterte Teilfrage", async () => {
    let n = 0
    const r = await enrichQuestions({
      draft: [frage("A?"), frage("B?"), frage("C?")],
      topic: "Sepsis",
      levels: [3, 3, 3],
      call: async () => {
        // Der zweite Aufruf scheitert dauerhaft (auch im Korrekturversuch).
        n++
        if (n === 2 || n === 3) throw new Error("kaputt")
        return antwort("Inhalt")
      },
    })
    expect(r.questions).toHaveLength(3)
    expect(r.failedIndices.length).toBeGreaterThanOrEqual(1)
    expect(r.questions.filter((q) => q.explanation).length).toBeGreaterThanOrEqual(1)
  })

  it("versucht bei formfehlerhafter Antwort genau eine Korrektur", async () => {
    let aufrufe = 0
    const r = await enrichQuestions({
      draft: [frage("A?")],
      topic: "Hyponatriämie",
      levels: [4],
      call: async () => {
        aufrufe++
        // Erster Versuch: falsche Anzahl Options-Erklärungen.
        if (aufrufe === 1) {
          return JSON.stringify({
            questions: [
              {
                keyTakeaway: "K",
                explanation: "E",
                mustKnow: "M",
                highYield: ["A"],
                mnemonic: "",
                optionExplanations: ["1", "2"],
              },
            ],
          })
        }
        return antwort("Inhalt")
      },
    })
    expect(aufrufe).toBe(2)
    expect(r.failedIndices).toEqual([])
    expect(r.questions[0].options.every((o) => !!o.explanation)).toBe(true)
  })

  it("lässt Fragestellung und Optionen auch nach der Anreicherung unangetastet", async () => {
    const draft = [frage("Unveränderliche Fragestellung?")]
    const r = await enrichQuestions({
      draft,
      topic: "Sepsis",
      levels: [3],
      // Ein Modell, das sich nicht ans Verbot hält, darf nichts bewirken.
      call: async () =>
        JSON.stringify({
          questions: [
            {
              stem: "GEKAPERTE FRAGE",
              options: [{ text: "gekapert", isCorrect: true }],
              keyTakeaway: "K".repeat(30),
              explanation: "E".repeat(500),
              mustKnow: "M".repeat(60),
              highYield: ["A".repeat(30), "B".repeat(30)],
              mnemonic: "",
              optionExplanations: Array.from({ length: 5 }, () => "X".repeat(200)),
            },
          ],
        }),
    })
    expect(r.questions[0].stem).toBe("Unveränderliche Fragestellung?")
    expect(r.questions[0].options).toHaveLength(5)
    expect(r.questions[0].options[0].text).toBe("Option A")
    expect(r.questions[0].options[0].isCorrect).toBe(true)
  })
})
