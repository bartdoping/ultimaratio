import { describe, it, expect } from "vitest"
import { buildDraftUserPrompt, buildSystemInstructions } from "../lib/ai-question-generator-prompt"

const sys = buildSystemInstructions()
const P = (difficulty: number) =>
  buildDraftUserPrompt({ topic: "Herzinsuffizienz", difficulty, mode: "single", variabilitySeed: 3, section: "klinik" })

describe("Keine formalen Lösungshinweise — auf jeder Stufe", () => {
  it("führt den Blindtest als Maßstab ein", () => {
    expect(sys).toMatch(/KEINE FORMALEN LÖSUNGSHINWEISE/)
    expect(sys).toMatch(/BLINDTEST/)
    expect(sys).toMatch(/nicht häufiger treffen als per Zufall \(1 von 5\)/)
  })

  it("stellt klar, dass der Stufen-Vorrang diese Regel NICHT aufhebt", () => {
    expect(sys).toMatch(/gilt auf JEDER Stufe, auch auf Stufe 1 und 2; der Stufen-Vorrang hebt diese Regel NICHT auf/)
  })

  it("verbietet die beobachteten Signale ausdrücklich", () => {
    expect(sys).toMatch(/Keine Begründungen in den Optionen/)
    expect(sys).toMatch(/Keine Dringlichkeits- oder Absolutwörter als Unterscheidungsmerkmal/)
    expect(sys).toMatch(/Keine Absicherung nur an der richtigen Antwort/)
    expect(sys).toMatch(/weder die längste noch die kürzeste/)
    expect(sys).toMatch(/Keine Strohmänner/)
  })
})

describe("Irreführung als Schwierigkeitsdimension", () => {
  it("definiert eine eigene Skala über alle fünf Stufen", () => {
    expect(sys).toMatch(/IRREFÜHRUNG ALS SCHWIERIGKEITSDIMENSION/)
    for (const stufe of ["Stufe 1 — keine Irreführung", "Stufe 2 — Verwechslungsgefahr", "Stufe 3 — echte Pseudolösungen", "Stufe 4 — gezielte Irreführung", "Stufe 5 — maximale Irreführung"]) {
      expect(sys).toContain(stufe)
    }
  })

  it("trennt Irreführung klar von Mehrdeutigkeit", () => {
    expect(sys).toMatch(/nie durch formale Signale und nie durch Mehrdeutigkeit/)
    expect(sys).toMatch(/zwei Optionen für gleich richtig, ist die Frage DEFEKT/)
  })

  it("nennt die Irreführung auch im Auftrag, je Stufe unterschiedlich", () => {
    expect(P(1)).toMatch(/Irreführung: keine/)
    expect(P(3)).toMatch(/Irreführung: echte Pseudolösungen/)
    expect(P(4)).toMatch(/Irreführung: gezielt/)
    expect(P(5)).toMatch(/Irreführung: maximal/)
  })

  it("verlangt den Blindtest in der Selbstprüfung auf leichten wie schweren Stufen", () => {
    expect(P(1)).toMatch(/BLINDTEST/)
    expect(P(5)).toMatch(/BLINDTEST/)
  })
})
