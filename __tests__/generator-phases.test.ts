import { describe, it, expect } from "vitest"
import {
  buildCaseContext,
  graftExplanations,
  parseEnrichResult,
  type EnrichedFields,
} from "../lib/generator-phases"
import { validateGeneratedQuestions } from "../lib/generator-validate"
import type { BulkQuestion } from "../lib/question-bulk-json"

function draftQuestion(overrides: Partial<BulkQuestion> = {}): BulkQuestion {
  return {
    stem: "Welche Akuttherapie ist bei einem INR von 1,4 im 3,5-h-Fenster indiziert?",
    allowImmediate: true,
    caseVignette: null,
    keyTakeaway: "Ein INR unter 1,7 erlaubt die systemische Lyse im 4,5-h-Fenster.",
    options: [
      { text: "Intravenöse Thrombolyse mit rtPA", isCorrect: true },
      { text: "Sofortige Vollheparinisierung", isCorrect: false },
      { text: "Acetylsalicylsäure 300 mg oral", isCorrect: false },
      { text: "Abwartendes Vorgehen bis INR < 1,0", isCorrect: false },
      { text: "Dekompressive Hemikraniektomie", isCorrect: false },
    ],
    ...overrides,
  }
}

const fields: EnrichedFields = {
  keyTakeaway: "Angereicherte Kernaussage.",
  explanation: "Abschnitt eins.\n\nAbschnitt zwei.\n\nAbschnitt drei.",
  mustKnow: "Cut-Off INR < 1,7.",
  highYield: ["Punkt A", "Punkt B"],
  mnemonic: "",
  optionExplanations: ["Zu A", "Zu B", "Zu C", "Zu D", "Zu E"],
}

describe("graftExplanations — die Frage bleibt unantastbar", () => {
  it("übernimmt Fragestellung, Optionstexte und Reihenfolge unverändert", () => {
    const draft = draftQuestion()
    const merged = graftExplanations(draft, fields)

    expect(merged.stem).toBe(draft.stem)
    expect(merged.options.map((o) => o.text)).toEqual(draft.options.map((o) => o.text))
    expect(merged.options.map((o) => o.isCorrect)).toEqual(draft.options.map((o) => o.isCorrect))
  })

  it("ignoriert Versuche der Anreicherung, die Frage zu verändern", () => {
    const draft = draftQuestion()
    // Ein Modell, das sich nicht an das Verbot hält, darf nichts ausrichten:
    // graftExplanations liest Frage und Optionen ausschließlich aus dem Entwurf.
    const merged = graftExplanations(draft, fields)

    expect(merged.stem).not.toMatch(/andere Frage/i)
    expect(merged.options).toHaveLength(5)
    expect(merged.options.filter((o) => o.isCorrect)).toHaveLength(1)
    expect(merged.options[0].isCorrect).toBe(true)
  })

  it("ordnet die Options-Erklärungen positionsgenau zu", () => {
    const merged = graftExplanations(draftQuestion(), fields)
    expect(merged.options.map((o) => o.explanation)).toEqual([
      "Zu A",
      "Zu B",
      "Zu C",
      "Zu D",
      "Zu E",
    ])
  })

  it("behält die Kernaussage des Entwurfs, wenn die Anreicherung keine liefert", () => {
    const draft = draftQuestion()
    const merged = graftExplanations(draft, { ...fields, keyTakeaway: "" })
    expect(merged.keyTakeaway).toBe(draft.keyTakeaway)
  })

  it("setzt eine leere Eselsbrücke auf null statt auf Leerstring", () => {
    const merged = graftExplanations(draftQuestion(), fields)
    expect(merged.mnemonic).toBeNull()
  })

  it("erhält den Falltext einer Fallfrage", () => {
    const vignette = "72-jährige Patientin, Wake-Up-Stroke, NIHSS 14."
    const merged = graftExplanations(draftQuestion({ caseVignette: vignette }), fields)
    expect(merged.caseVignette).toBe(vignette)
  })
})

describe("parseEnrichResult", () => {
  const valid = {
    keyTakeaway: "K",
    explanation: "E",
    mustKnow: "M",
    highYield: ["A", "B"],
    mnemonic: "",
    optionExplanations: ["1", "2", "3", "4", "5"],
  }

  it("liest die Form { questions: [ … ] }", () => {
    const r = parseEnrichResult(JSON.stringify({ questions: [valid] }), 5)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.fields.optionExplanations).toHaveLength(5)
  })

  it("liest auch das nackte Objekt ohne questions-Hülle", () => {
    const r = parseEnrichResult(JSON.stringify(valid), 5)
    expect(r.ok).toBe(true)
  })

  it("lehnt eine falsche Anzahl Options-Erklärungen ab", () => {
    const r = parseEnrichResult(JSON.stringify({ ...valid, optionExplanations: ["1", "2"] }), 5)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/2 Options-Erklärungen erhalten, 5 erwartet/)
  })

  it("lehnt leere Options-Erklärungen ab", () => {
    const r = parseEnrichResult(
      JSON.stringify({ ...valid, optionExplanations: ["1", "", "3", "4", "5"] }),
      5
    )
    expect(r.ok).toBe(false)
  })

  it("lehnt eine fehlende Gesamterklärung ab", () => {
    const r = parseEnrichResult(JSON.stringify({ ...valid, explanation: "  " }), 5)
    expect(r.ok).toBe(false)
  })

  it("lehnt ungültiges JSON ab, ohne zu werfen", () => {
    expect(parseEnrichResult("kein json", 5).ok).toBe(false)
  })

  it("verkraftet fehlendes mnemonic und fehlendes highYield", () => {
    const { mnemonic: _m, highYield: _h, ...ohne } = valid
    const r = parseEnrichResult(JSON.stringify(ohne), 5)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.fields.mnemonic).toBe("")
      expect(r.fields.highYield).toEqual([])
    }
  })
})

describe("Entwurfs-Validierung", () => {
  const draftJson = (q: unknown) => JSON.stringify({ questions: [q] })

  it("akzeptiert einen Entwurf ohne Erklärungen", () => {
    const r = validateGeneratedQuestions(draftJson(draftQuestion()), "single", 1, "draft")
    expect(r.ok).toBe(true)
  })

  it("weist denselben Entwurf in der vollen Prüfung ab (mustKnow fehlt)", () => {
    const r = validateGeneratedQuestions(draftJson(draftQuestion()), "single", 1, "full")
    expect(r.ok).toBe(false)
  })

  it("verlangt auch im Entwurf genau eine richtige Antwort", () => {
    const q = draftQuestion()
    q.options[1].isCorrect = true
    const r = validateGeneratedQuestions(draftJson(q), "single", 1, "draft")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/genau eine richtige Antwort/i)
  })

  it("verlangt auch im Entwurf genau 5 Optionen", () => {
    const q = draftQuestion()
    q.options = q.options.slice(0, 4)
    const r = validateGeneratedQuestions(draftJson(q), "single", 1, "draft")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/5 Antwortoptionen/i)
  })

  it("verlangt im Entwurf eine substanzielle Kernaussage", () => {
    const r = validateGeneratedQuestions(
      draftJson(draftQuestion({ keyTakeaway: "kurz" })),
      "single",
      1,
      "draft"
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/keyTakeaway/)
  })

  it("prüft den Falltext einer Fallfrage bereits im Entwurf", () => {
    const r = validateGeneratedQuestions(
      JSON.stringify({ questions: [draftQuestion({ caseVignette: "zu kurz" })] }),
      "case",
      1,
      "draft"
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Fallvignette zu knapp/i)
  })
})

describe("buildCaseContext", () => {
  it("bleibt bei Einzelfragen leer", () => {
    expect(buildCaseContext([draftQuestion()], 0)).toBe("")
  })

  it("markiert die zu erklärende Teilfrage und nennt alle Stems", () => {
    const qs = [
      draftQuestion({ stem: "Erste Teilfrage?" }),
      draftQuestion({ stem: "Zweite Teilfrage?" }),
      draftQuestion({ stem: "Dritte Teilfrage?" }),
    ]
    const ctx = buildCaseContext(qs, 1)
    expect(ctx).toContain("Erste Teilfrage?")
    expect(ctx).toContain("Dritte Teilfrage?")
    expect(ctx).toMatch(/Teilfrage 2: Zweite Teilfrage\?\s+<-- DIESE Teilfrage erklärst du/)
    expect(ctx).toMatch(/SPÄTERER Teilfragen nicht vorwegnehmen/)
  })
})
