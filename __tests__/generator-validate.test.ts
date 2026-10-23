import { describe, it, expect } from "vitest"
import {
  validateGeneratedQuestions,
  questionsHaveExplanations,
  checkExplanationDepth,
  buildDepthRepairHint,
  QUESTION_QUALITY,
} from "../lib/generator-validate"

function makeOptions(correctIndex: number) {
  return Array.from({ length: 5 }, (_, i) => ({
    text: `Option ${i + 1}`,
    isCorrect: i === correctIndex,
    explanation:
      i === correctIndex
        ? "Richtig, weil ein INR unter 1,7 die systemische Lyse im 4,5-h-Fenster erlaubt."
        : `Option ${i + 1} ist hier zu früh — richtig wäre sie bei bereits ausgeschlossener Blutung.`,
  }))
}

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    stem: "Eine ausführliche, klinisch realistische Fragestellung mit ausreichend Kontext für Single-Best-Answer-Logik?",
    explanation: null as string | null,
    keyTakeaway:
      "In dieser Konstellation entscheidet nicht das Alter, sondern die Kontraindikationsliste über die Akuttherapie.",
    mustKnow: "Ein INR unter 1,7 ist keine Kontraindikation für die Lyse.",
    highYield: [] as string[],
    mnemonic: "",
    allowImmediate: true,
    caseVignette: null as string | null,
    options: makeOptions(2),
    ...overrides,
  }
}

function longVignette(): string {
  return (
    "Ein 68-jähriger Patient mit bekannter arterieller Hypertonie und Vorhofflimmern unter Marcumar wird mit plötzlich aufgetretener Hemiparese rechts und Aphasie in die Notaufnahme gebracht. Symptombeginn ist 2 Stunden zuvor zeugengesehen erfolgt. Bei Eintreffen NIHSS 9, RR 168/95 mmHg, INR 1,4, übrige Vitalparameter stabil. Die initiale Bildgebung wird vorbereitet."
  )
}

describe("validateGeneratedQuestions", () => {
  it("akzeptiert eine gültige Einzelfrage", () => {
    const json = JSON.stringify({ questions: [makeQuestion()] })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(true)
  })

  it("lehnt fehlendes mustKnow ab", () => {
    const json = JSON.stringify({
      questions: [makeQuestion({ mustKnow: "" })],
    })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/mustKnow/)
  })

  it("lehnt zu generisches mustKnow ab", () => {
    const json = JSON.stringify({
      questions: [
        makeQuestion({ mustKnow: "Verständnis von Schlaganfall." }),
      ],
    })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/mustKnow/)
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
    const v = longVignette()
    const json = JSON.stringify({
      questions: [
        makeQuestion({ caseVignette: v, stem: "Welche initiale Diagnostik ist primär indiziert?" }),
        makeQuestion({ caseVignette: v, stem: "Welche Akuttherapie ist gemäß Leitlinie indiziert?" }),
        makeQuestion({ caseVignette: v, stem: "Welche Komplikation ist in den ersten 24 h besonders zu fürchten?" }),
        makeQuestion({ caseVignette: v, stem: "Welche Sekundärprävention ist langfristig vorgesehen?" }),
      ],
    })
    const result = validateGeneratedQuestions(json, "case", 4)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.questions).toHaveLength(4)
  })

  it("lehnt zu kurze Fallvignette ab", () => {
    const short = "Ein 65-jähriger Patient stellt sich vor."
    const json = JSON.stringify({
      questions: [
        makeQuestion({ caseVignette: short, stem: "Q1" }),
        makeQuestion({ caseVignette: short, stem: "Q2" }),
      ],
    })
    const result = validateGeneratedQuestions(json, "case", 2)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Vignette/i)
  })

  it("lehnt Fallfrage mit unterschiedlichen Vignetten ab", () => {
    const json = JSON.stringify({
      questions: [
        makeQuestion({ caseVignette: longVignette() + " A", stem: "Q1" }),
        makeQuestion({ caseVignette: longVignette() + " B", stem: "Q2" }),
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
  it("erkennt fehlenden Aha-Satz", () => {
    const q = makeQuestion({ keyTakeaway: "" })
    expect(questionsHaveExplanations([q as never])).toBe(false)
  })

  it("verlangt KEINE Vertiefung — sie entsteht nur auf Anforderung", () => {
    const q = makeQuestion({ explanation: "" })
    expect(questionsHaveExplanations([q as never])).toBe(true)
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

describe("checkExplanationDepth", () => {
  it("findet keine harten Defizite bei vollständigen Fragen", () => {
    const q = makeQuestion() as never
    const issues = checkExplanationDepth([q]).filter((i) => i.kind !== "mnemonic_missing")
    expect(issues).toHaveLength(0)
  })

  it("meldet einen zu langen Aha-Satz", () => {
    const q = makeQuestion({ keyTakeaway: "Sehr lang. ".repeat(40) })
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "key_takeaway_long")).toBe(true)
  })

  it("meldet Absätze, wo ein Satz verlangt ist", () => {
    const q = makeQuestion()
    q.options[0].explanation = "Ein ganzer Absatz statt eines Satzes. ".repeat(10)
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "option_long")).toBe(true)
  })

  it("meldet zu kurze Erklärung der korrekten Option", () => {
    const q = makeQuestion()
    q.options[2].explanation = "Zu knapp."
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "correct_option_short")).toBe(true)
  })

  it("meldet zu kurze Distraktor-Erklärung", () => {
    const q = makeQuestion()
    q.options[0].explanation = "knapp"
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "distractor_short")).toBe(true)
  })

  it("meldet fehlendes mnemonic mit eigener (weicher) Kategorie", () => {
    const q = makeQuestion({ mnemonic: "" })
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "mnemonic_missing")).toBe(true)
  })

  it("meldet zu kurzes mustKnow als Defizit", () => {
    const q = makeQuestion({ mustKnow: "Kurz." })
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "must_know_short")).toBe(true)
  })

  it("meldet fehlende Kernaussage (keyTakeaway)", () => {
    const q = makeQuestion({ keyTakeaway: "" })
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "key_takeaway_short")).toBe(true)
  })

  it("verlangt keine High-Yield-Punkte mehr", () => {
    const q = makeQuestion({ highYield: [] })
    expect(checkExplanationDepth([q as never]).filter((i) => i.kind !== "mnemonic_missing")).toEqual([])
  })

  it("wertet keyTakeaway/highYield/mnemonic nicht als harte Defizite", () => {
    // Vollständige Frage → keine der weichen Kategorien darf als hart zählen.
    const q = makeQuestion() as never
    const issues = checkExplanationDepth([q])
    expect(issues.some((i) => i.kind === "key_takeaway_short")).toBe(false)
  })

  it("baut nicht-leeren Repair-Hint nur bei Issues", () => {
    expect(buildDepthRepairHint([])).toBe("")
    const hint = buildDepthRepairHint([
      {
        questionIndex: 0,
        kind: "key_takeaway_short",
        detail: "zu kurz",
      },
    ])
    expect(hint.length).toBeGreaterThan(40)
    expect(hint).toMatch(/GENAU EIN Satz/)
  })

  it("Schwellen sind sinnvoll konfiguriert", () => {
    // Kurz, aber nicht leer: ein Satz passt zwischen Unter- und Obergrenze.
    expect(QUESTION_QUALITY.MAX_OPTION_EXPL_CHARS).toBeGreaterThan(QUESTION_QUALITY.MIN_CORRECT_OPTION_EXPL_CHARS * 4)
    expect(QUESTION_QUALITY.MAX_KEY_TAKEAWAY_CHARS).toBeLessThanOrEqual(400)
    expect(QUESTION_QUALITY.MIN_CORRECT_OPTION_EXPL_CHARS).toBeGreaterThan(
      QUESTION_QUALITY.MIN_DISTRACTOR_EXPL_CHARS
    )
  })
})
