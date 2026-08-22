import { describe, it, expect } from "vitest"
import {
  detectGenerationPhase,
  estimateProgress,
  PHASE_LABEL,
} from "../lib/stream-preview"

describe("detectGenerationPhase", () => {
  it("startet bei leerem Text mit 'start'", () => {
    expect(detectGenerationPhase("")).toBe("start")
  })

  it("erkennt die Fragestellungs-Phase", () => {
    expect(detectGenerationPhase('{"questions":[{"stem":"Ein 68-jähriger')).toBe("stem")
  })

  it("erkennt die Optionen-Phase", () => {
    const t = '{"questions":[{"stem":"Frage?","options":[{"text":"rtPA"'
    expect(detectGenerationPhase(t)).toBe("options")
  })

  it("erkennt die Erklärungs-Phase", () => {
    const t = '{"questions":[{"stem":"F","options":[],"explanation":"Weil'
    expect(detectGenerationPhase(t)).toBe("explanations")
  })

  it("erkennt die Abschluss-Phase", () => {
    const t = '{"questions":[{"stem":"F","explanation":"x","mustKnow":"y"'
    expect(detectGenerationPhase(t)).toBe("polishing")
  })

  it("wirft nie bei kaputtem Input", () => {
    expect(() => detectGenerationPhase("völliger unsinn")).not.toThrow()
    expect(() => detectGenerationPhase('{"questions":[{')).not.toThrow()
  })

  it("gibt für jede Phase ein Label", () => {
    const phases = ["start", "stem", "options", "explanations", "polishing", "verifying"] as const
    for (const p of phases) {
      expect(PHASE_LABEL[p]).toBeTruthy()
    }
  })
})

describe("estimateProgress", () => {
  it("liefert 0 ohne Erwartungswert", () => {
    expect(estimateProgress(100, 0)).toBe(0)
  })

  it("skaliert linear und deckelt bei 95", () => {
    expect(estimateProgress(0, 1000)).toBe(0)
    expect(estimateProgress(500, 1000)).toBe(48)
    expect(estimateProgress(5000, 1000)).toBe(95)
  })
})
