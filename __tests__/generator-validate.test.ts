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
        ? // Genug Tiefe, um die Min-Schwelle (220 Zeichen) für die korrekte Option zu erfüllen.
          "Diese Option ist korrekt, weil der zugrundeliegende Pathomechanismus auf einer Endothelschädigung mit konsekutiver Thrombozytenaggregation beruht. Klinisch lässt sich dies anhand des in der Vignette beschriebenen Verlaufs und der etablierten Cut-Off-Werte rekonstruieren. Die Leitlinie empfiehlt in dieser Konstellation genau dieses Vorgehen. Der vermeintliche Standardreflex wäre eine andere Option, der jedoch das hier vorliegende Risikoprofil missachten würde."
        : // Distraktor-Erklärung über 140 Zeichen.
          `Option ${i + 1} ist hier falsch, weil die zugrundeliegende Logik in dieser klinischen Konstellation nicht greift. In einem anderen Setting mit unterschiedlichen Voraussetzungen wäre genau diese Option die richtige Wahl; die häufige Verwechslung resultiert aus oberflächlicher Mustererkennung.`,
  }))
}

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    stem: "Eine ausführliche, klinisch realistische Fragestellung mit ausreichend Kontext für Single-Best-Answer-Logik?",
    explanation:
      "Pathophysiologisch liegt eine Endothelschaedigung mit Thrombozytenaktivierung und konsekutiver Mikrothrombenbildung vor. Diese Kaskade erklaert sowohl die Akutsymptomatik als auch den Befundverlauf.\n\nKlinisch ergibt sich daraus ein klares Vorgehen entlang der aktuellen Leitlinienempfehlung: zunaechst Risikostratifizierung anhand etablierter Scores, dann zeitkritische Therapieentscheidung mit Beruecksichtigung der absoluten und relativen Kontraindikationen. Die genannten Cut-Off-Werte sind dabei verbindlich.\n\nTake-Home: Der Standardreflex 'erst observieren' verspielt in dieser Konstellation das therapeutische Fenster - der entscheidende Punkt ist die parallele Diagnostik und Therapieeinleitung.",
    learningObjective:
      "Erkennen, dass bei dieser klinischen Konstellation die etablierte Akuttherapie trotz scheinbarer Kontraindikation indiziert ist, weil die Risiko-Nutzen-Abwägung gemäß aktueller Leitlinie eindeutig zugunsten der Intervention ausfällt.",
    examTrap:
      "Häufige Verwechslung mit einer eng verwandten Differenzialdiagnose, die jedoch ein anderes Akutmanagement erfordert; das entscheidende Trennmerkmal ist anhand des im Stem beschriebenen Befundes erkennbar.",
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

  it("lehnt fehlendes learningObjective ab", () => {
    const json = JSON.stringify({
      questions: [makeQuestion({ learningObjective: "" })],
    })
    const result = validateGeneratedQuestions(json, "single", 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/learningObjective/)
  })

  it("lehnt zu generisches learningObjective ab", () => {
    const json = JSON.stringify({
      questions: [
        makeQuestion({ learningObjective: "Verständnis von Schlaganfall." }),
      ],
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

describe("checkExplanationDepth", () => {
  it("findet keine Defizite bei vollständigen Fragen", () => {
    const q = makeQuestion() as never
    const issues = checkExplanationDepth([q]).filter((i) => i.kind !== "exam_trap_missing")
    expect(issues).toHaveLength(0)
  })

  it("meldet zu kurze Gesamterklärung", () => {
    const q = makeQuestion({ explanation: "Sehr kurze Erklärung." })
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "total_explanation_short")).toBe(true)
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

  it("meldet fehlende examTrap mit eigener Kategorie", () => {
    const q = makeQuestion({ examTrap: "" })
    const issues = checkExplanationDepth([q as never])
    expect(issues.some((i) => i.kind === "exam_trap_missing")).toBe(true)
  })

  it("baut nicht-leeren Repair-Hint nur bei Issues", () => {
    expect(buildDepthRepairHint([])).toBe("")
    const hint = buildDepthRepairHint([
      {
        questionIndex: 0,
        kind: "total_explanation_short",
        detail: "zu kurz",
      },
    ])
    expect(hint.length).toBeGreaterThan(40)
    expect(hint).toMatch(/Drei-Abschnitts-Struktur/)
  })

  it("Schwellen sind sinnvoll konfiguriert", () => {
    expect(QUESTION_QUALITY.MIN_TOTAL_EXPLANATION_CHARS).toBeGreaterThanOrEqual(300)
    expect(QUESTION_QUALITY.MIN_CORRECT_OPTION_EXPL_CHARS).toBeGreaterThan(
      QUESTION_QUALITY.MIN_DISTRACTOR_EXPL_CHARS
    )
  })
})
