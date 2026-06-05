import { describe, it, expect } from "vitest"
import {
  buildUserPrompt,
  buildSystemInstructions,
  __TEST_INTERNALS__,
} from "../lib/ai-question-generator-prompt"

describe("ai-question-generator-prompt — Schwierigkeit & Tiefe", () => {
  it("enthält kalibrierte Schwierigkeitsstufen mit konkreten Ankerbeispielen", () => {
    const sys = buildSystemInstructions()
    expect(sys).toMatch(/STUFE 1/)
    expect(sys).toMatch(/STUFE 4/)
    expect(sys).toMatch(/STUFE 5/)
    expect(sys).toMatch(/QUALITÄTS-MESSLATTE/)
    expect(sys).toMatch(/Wikipedia/i) // "etwas Neues jenseits Wikipedia"
    expect(sys).toMatch(/ERKLÄRUNGS-MANDAT/)
    expect(sys).toMatch(/ANTI-CLICHÉ/)
  })

  it("erwähnt die wichtigen Erklärungs-Strukturen (Pathophysiologie / Algorithmus / Take-Home)", () => {
    const sys = buildSystemInstructions()
    expect(sys).toMatch(/Pathophysiologi/i)
    expect(sys).toMatch(/Algorithmus/i)
    expect(sys).toMatch(/Take-Home/i)
  })

  it("liefert für Stufe 4 einen anspruchsvollen Hint mit Cut-Offs/Zeitfenster", () => {
    const prompt = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 4,
      mode: "single",
      variabilitySeed: 1,
    })
    expect(prompt).toMatch(/Schwierigkeit 4/i)
    expect(prompt).toMatch(/Cut-Off|Zeitfenster|Sub-Indikationen/i)
  })

  it("liefert für Stufe 5 explizite Subspezialist-/Curiosa-Anforderungen", () => {
    const prompt = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 5,
      mode: "single",
      variabilitySeed: 1,
    })
    expect(prompt).toMatch(/Schwierigkeit 5/i)
    expect(prompt).toMatch(/Subspezialist|Curiosa|Fun Facts/i)
  })

  it("benennt für jede Stufe einen klaren Wer-kennt-das-Anker", () => {
    const sys = buildSystemInstructions()
    expect(sys).toMatch(/Laie/i)
    expect(sys).toMatch(/Vorklinikum|Vorklinik/i)
    expect(sys).toMatch(/Hammerexamen|Examenskandidat/i)
    expect(sys).toMatch(/Facharzt/i)
    expect(sys).toMatch(/Subspezialist/i)
  })

  it("erzwingt deutsches medizinisches Vokabular", () => {
    const sys = buildSystemInstructions()
    expect(sys).toMatch(/DEUTSCHE MEDIZINISCHE FACHSPRACHE/i)
    expect(sys).toMatch(/Anglizismen/i)
    expect(sys).toMatch(/imponiert|pathognomonisch|kontraindiziert/i)
  })

  it("nennt mustKnow und mnemonic als neue Felder (statt learningObjective/examTrap)", () => {
    const sys = buildSystemInstructions()
    expect(sys).toMatch(/"mustKnow"/)
    expect(sys).toMatch(/"mnemonic"/)
    // Klare Aussage, dass mnemonic leer bleiben darf
    expect(sys).toMatch(/mnemonic.*leer/i)
  })
})

describe("ai-question-generator-prompt — Variabilität (Random-Angle)", () => {
  it("injiziert für unterschiedliche Seeds unterschiedliche Fokus-Winkel", () => {
    const a = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 3,
      mode: "single",
      variabilitySeed: 1,
    })
    const b = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 3,
      mode: "single",
      variabilitySeed: 999,
    })
    expect(a).not.toBe(b)
    expect(a).toMatch(/FOKUS-WINKEL/)
    expect(b).toMatch(/FOKUS-WINKEL/)
  })

  it("reproduziert exakt denselben Prompt bei gleichem Seed (deterministisch)", () => {
    const a = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 3,
      mode: "single",
      variabilitySeed: 42,
    })
    const b = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 3,
      mode: "single",
      variabilitySeed: 42,
    })
    expect(a).toBe(b)
  })

  it("enthält Patient-Archetyp und Verbot des Standard-Reflexes", () => {
    const p = buildUserPrompt({
      topic: "Diabetes mellitus",
      difficulty: 4,
      mode: "single",
      variabilitySeed: 7,
    })
    expect(p).toMatch(/PATIENT-ARCHETYP/)
    expect(p).toMatch(/VERBOTENER STANDARD-REFLEX/)
  })

  it("hat ein ausreichend großes Angle-/Archetype-Repertoire", () => {
    expect(__TEST_INTERNALS__.FOCUS_ANGLES.length).toBeGreaterThanOrEqual(15)
    expect(__TEST_INTERNALS__.PATIENT_ARCHETYPES.length).toBeGreaterThanOrEqual(10)
    // Mit Mulberry32 + Salt soll die Verteilung über viele Seeds breit sein:
    const counts = new Map<string, number>()
    for (let seed = 0; seed < 200; seed++) {
      const angle = __TEST_INTERNALS__.pickBySeed(
        __TEST_INTERNALS__.FOCUS_ANGLES,
        seed,
        1
      )
      counts.set(angle, (counts.get(angle) ?? 0) + 1)
    }
    // Mindestens 8 unterschiedliche Angles bei 200 Seeds.
    expect(counts.size).toBeGreaterThanOrEqual(8)
  })

  it("Fall-Modus injiziert ggf. einen zweiten Fokus-Winkel", () => {
    const p = buildUserPrompt({
      topic: "Akutes Koronarsyndrom",
      difficulty: 4,
      mode: "case",
      caseQuestionCount: 4,
      variabilitySeed: 100,
    })
    // Es darf maximal einer von beiden gleich sein – meistens ist der zweite Winkel da.
    expect(p).toMatch(/FOKUS-WINKEL/)
  })
})

describe("ai-question-generator-prompt — Anti-Cliché & Self-Check", () => {
  it("erwähnt explizit verbotene Standardmuster (Trias, häufigste Ursache, Begriffsidentifikation)", () => {
    const sys = buildSystemInstructions()
    expect(sys).toMatch(/Trias/i)
    expect(sys).toMatch(/häufigste Ursache/i)
    expect(sys).toMatch(/Begriffsidentifikation/i)
  })

  it("verlangt einen finalen Self-Check vor der Ausgabe", () => {
    const prompt = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 3,
      mode: "single",
      variabilitySeed: 1,
    })
    expect(prompt).toMatch(/Selbst-Check/i)
  })
})
