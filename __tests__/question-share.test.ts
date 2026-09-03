import { describe, it, expect } from "vitest"
import { formatQuestionForSharing } from "../lib/question-share"
import type { BulkQuestion } from "../lib/question-bulk-json"

const frage: BulkQuestion = {
  stem: "Welche Akuttherapie ist primär indiziert?",
  allowImmediate: true,
  caseVignette: null,
  keyTakeaway: "Ein INR unter 1,7 erlaubt die Lyse im 4,5-h-Fenster.",
  options: [
    { text: "Intravenöse Thrombolyse mit rtPA", isCorrect: false },
    { text: "Sofortige Vollheparinisierung", isCorrect: true },
    { text: "Acetylsalicylsäure 300 mg oral", isCorrect: false },
  ],
}

const meta = { topic: "Schlaganfall", difficulty: 4 }

describe("formatQuestionForSharing", () => {
  it("enthält Fragestellung und alle Optionen mit Buchstaben", () => {
    const t = formatQuestionForSharing(frage, meta)
    expect(t).toContain("Welche Akuttherapie ist primär indiziert?")
    expect(t).toContain("A) Intravenöse Thrombolyse mit rtPA")
    expect(t).toContain("B) Sofortige Vollheparinisierung")
    expect(t).toContain("C) Acetylsalicylsäure 300 mg oral")
  })

  it("nennt den richtigen Lösungsbuchstaben", () => {
    expect(formatQuestionForSharing(frage, meta)).toContain("Lösung: B")
  })

  it("stellt die Lösung hinter eine Trennlinie, nicht direkt unter die Optionen", () => {
    const t = formatQuestionForSharing(frage, meta)
    const trenner = t.indexOf("—".repeat(24))
    expect(trenner).toBeGreaterThan(t.indexOf("C)"))
    expect(t.indexOf("Lösung:")).toBeGreaterThan(trenner)
  })

  it("nennt Thema und Stufe", () => {
    expect(formatQuestionForSharing(frage, meta)).toContain("Schlaganfall · Stufe 4/5")
  })

  it("nimmt den Falltext auf, wenn vorhanden", () => {
    const t = formatQuestionForSharing(
      { ...frage, caseVignette: "72-jährige Patientin, NIHSS 14." },
      meta
    )
    expect(t.indexOf("72-jährige Patientin")).toBeLessThan(t.indexOf("Welche Akuttherapie"))
  })

  it("hängt die Adresse nur an, wenn sie übergeben wurde", () => {
    expect(formatQuestionForSharing(frage, meta)).not.toContain("Selbst erzeugt auf")
    expect(formatQuestionForSharing(frage, meta, "https://fragenkreuzen.de")).toContain(
      "Selbst erzeugt auf https://fragenkreuzen.de"
    )
  })

  it("kommt ohne markierte richtige Antwort zurecht", () => {
    const ohne = { ...frage, options: frage.options.map((o) => ({ ...o, isCorrect: false })) }
    expect(formatQuestionForSharing(ohne, meta)).toContain("Lösung: nicht eindeutig")
  })
})
