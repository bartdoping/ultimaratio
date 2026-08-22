import { describe, it, expect } from "vitest"
import { parseGenerateRequest } from "../lib/generator-request"
import {
  resolveDifficulties,
  buildUserPrompt,
} from "../lib/ai-question-generator-prompt"

describe("parseGenerateRequest", () => {
  it("lehnt zu kurze Themen ab", () => {
    const r = parseGenerateRequest({ topic: "ab", difficulty: 3 })
    expect(r.ok).toBe(false)
  })

  it("lehnt Schwierigkeiten außerhalb 1–5 ab", () => {
    expect(parseGenerateRequest({ topic: "Schlaganfall", difficulty: 0 }).ok).toBe(false)
    expect(parseGenerateRequest({ topic: "Schlaganfall", difficulty: 6 }).ok).toBe(false)
  })

  it("akzeptiert eine Einzelfrage", () => {
    const r = parseGenerateRequest({ topic: "Schlaganfall", difficulty: 3 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.expectedCount).toBe(1)
      expect(r.value.mode).toBe("single")
      expect(r.value.difficulties).toEqual([])
    }
  })

  it("verlangt bei Fallfragen 2–5 Teilfragen", () => {
    expect(
      parseGenerateRequest({ topic: "ACS", difficulty: 3, mode: "case", caseQuestionCount: 1 }).ok
    ).toBe(false)
    expect(
      parseGenerateRequest({ topic: "ACS", difficulty: 3, mode: "case", caseQuestionCount: 6 }).ok
    ).toBe(false)
  })

  it("übernimmt Schwierigkeiten je Teilfrage", () => {
    const r = parseGenerateRequest({
      topic: "ACS",
      difficulty: 3,
      mode: "case",
      caseQuestionCount: 3,
      difficulties: [2, 4, 5],
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.difficulties).toEqual([2, 4, 5])
  })

  it("füllt ein unvollständiges Array mit der Gesamtschwierigkeit auf", () => {
    const r = parseGenerateRequest({
      topic: "ACS",
      difficulty: 3,
      mode: "case",
      caseQuestionCount: 4,
      difficulties: [1, 5],
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.difficulties).toEqual([1, 5, 3, 3])
  })

  it("begrenzt Ausreißer auf 1–5 statt die Anfrage abzulehnen", () => {
    const r = parseGenerateRequest({
      topic: "ACS",
      difficulty: 3,
      mode: "case",
      caseQuestionCount: 3,
      difficulties: [0, 99, "quatsch"],
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.difficulties).toEqual([1, 5, 3])
  })
})

describe("resolveDifficulties", () => {
  it("liefert für Einzelfragen genau einen Wert", () => {
    expect(resolveDifficulties({ topic: "x", difficulty: 4, mode: "single" })).toEqual([4])
  })

  it("verteilt die Gesamtschwierigkeit, wenn nichts Einzelnes gesetzt ist", () => {
    expect(
      resolveDifficulties({ topic: "x", difficulty: 2, mode: "case", caseQuestionCount: 3 })
    ).toEqual([2, 2, 2])
  })

  it("respektiert individuelle Stufen", () => {
    expect(
      resolveDifficulties({
        topic: "x",
        difficulty: 3,
        mode: "case",
        caseQuestionCount: 3,
        difficulties: [1, 3, 5],
      })
    ).toEqual([1, 3, 5])
  })
})

describe("buildUserPrompt — Schwierigkeit je Teilfrage", () => {
  it("nennt bei gemischten Stufen jede Teilfrage einzeln", () => {
    const p = buildUserPrompt({
      topic: "Akutes Koronarsyndrom",
      difficulty: 3,
      mode: "case",
      caseQuestionCount: 3,
      difficulties: [1, 3, 5],
      variabilitySeed: 7,
    })
    expect(p).toMatch(/Schwierigkeitsgrade der Teilfragen/)
    expect(p).toMatch(/Teilfrage 1: Stufe 1 von 5/)
    expect(p).toMatch(/Teilfrage 2: Stufe 3 von 5/)
    expect(p).toMatch(/Teilfrage 3: Stufe 5 von 5/)
    expect(p).toMatch(/Reihenfolge im questions-Array MUSS/)
  })

  it("nutzt bei einheitlicher Stufe den kompakten Block", () => {
    const p = buildUserPrompt({
      topic: "Akutes Koronarsyndrom",
      difficulty: 4,
      mode: "case",
      caseQuestionCount: 3,
      difficulties: [4, 4, 4],
      variabilitySeed: 7,
    })
    expect(p).not.toMatch(/Schwierigkeitsgrade der Teilfragen/)
    expect(p).toMatch(/- Schwierigkeitsgrad: 4 von 5/)
  })
})
