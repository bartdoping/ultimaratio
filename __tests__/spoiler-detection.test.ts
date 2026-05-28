import { describe, it, expect } from "vitest"
import { detectSpoilers, buildSpoilerRepairHint } from "../lib/spoiler-detection"
import type { BulkQuestion } from "../lib/question-bulk-json"

function options(correctIndex: number, texts: string[]) {
  return texts.map((text, i) => ({
    text,
    isCorrect: i === correctIndex,
    // Erklärung bewusst spezifisch zur Option, damit Test-Fixtures
    // kein gemeinsames Vokabular zwischen Fragen einschleppen.
    explanation: `Hinweise zur Option ${text}.`,
  }))
}

function q(input: {
  stem: string
  correct: number
  opts: string[]
  explanation?: string
  learningObjective?: string
  examTrap?: string
  caseVignette?: string | null
  correctExplanation?: string
}): BulkQuestion {
  const built = options(input.correct, input.opts)
  if (input.correctExplanation) {
    built[input.correct].explanation = input.correctExplanation
  }
  return {
    stem: input.stem,
    explanation: input.explanation ?? "Gesamtdarstellung der Antwortlogik.",
    learningObjective: input.learningObjective ?? "Allgemeine Lernhinweise.",
    examTrap: input.examTrap ?? "",
    allowImmediate: true,
    caseVignette: input.caseVignette ?? "Eine 65-jährige Patientin stellt sich akut vor.",
    options: built,
  }
}

describe("detectSpoilers", () => {
  it("findet einen offensichtlichen Spoiler (Diagnose-Begriff in Q1-Erklärung)", () => {
    const questions: BulkQuestion[] = [
      q({
        stem: "Welche initiale Maßnahme ist beim akuten Thoraxschmerz indiziert?",
        correct: 0,
        opts: ["12-Kanal-EKG", "MRT", "Sonographie", "Röntgen", "Spirometrie"],
        explanation:
          "Beim akuten Thoraxschmerz mit Verdacht auf Myokardinfarkt ist das 12-Kanal-EKG zwingend.",
      }),
      q({
        stem: "Welche Diagnose passt am besten zum Befund?",
        correct: 1,
        opts: ["Lungenembolie", "Myokardinfarkt", "Pneumothorax", "Aortendissektion", "Perikarditis"],
        correctExplanation: "Hebung im EKG plus typischer Troponin-Verlauf passt zum Infarktbild.",
      }),
    ]
    const hits = detectSpoilers(questions)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].earlierQuestion).toBe(1)
    expect(hits[0].laterQuestion).toBe(2)
    expect(hits[0].terms.some((t) => t.includes("myokardinfarkt"))).toBe(true)
  })

  it("ignoriert nur generische Begriffe (kein Spoiler, da Stopwords)", () => {
    const questions: BulkQuestion[] = [
      q({
        stem: "Welche Maßnahme zuerst?",
        correct: 0,
        opts: ["EKG", "Labor", "MRT", "CT", "Sonographie"],
        explanation: "Die Therapie hängt vom Patientenzustand und Befund ab.",
        learningObjective: "",
        examTrap: "",
      }),
      q({
        stem: "Welche Diagnose ist wahrscheinlich?",
        correct: 0,
        opts: ["Pneumonie", "Bronchitis", "Pleuritis", "Asthma", "Tonsillitis"],
        explanation: "Verschiedene differenzialdiagnostische Erwägungen.",
        learningObjective: "",
        examTrap: "",
      }),
    ]
    const hits = detectSpoilers(questions)
    expect(hits).toHaveLength(0)
  })

  it("ignoriert Zahlen und Einheiten", () => {
    const questions: BulkQuestion[] = [
      q({
        stem: "Welcher Blutdruck liegt vor?",
        correct: 2,
        opts: ["120/80", "100/60", "180/110", "90/50", "140/90"],
        explanation: "Hypertensive Entgleisung mit Werten weit über der Grenze.",
        learningObjective: "",
        examTrap: "",
      }),
      q({
        stem: "Welche Sofortmaßnahme ist indiziert?",
        correct: 1,
        opts: ["180/110", "Urapidil", "Heparin", "ASS", "Furosemid"],
        explanation: "Akute Senkung mit Urapidil unter Monitoring.",
        learningObjective: "",
        examTrap: "",
      }),
    ]
    const hits = detectSpoilers(questions)
    // Reine Zahl '180/110' darf nicht als Spoiler zählen.
    expect(hits.every((h) => h.terms.every((t) => !/^[\d./]+$/.test(t)))).toBe(true)
  })

  it("erkennt Spoiler über mehrere Teilfragen hinweg", () => {
    const questions: BulkQuestion[] = [
      q({
        stem: "Initialer Schritt?",
        correct: 2,
        opts: ["MRT", "Sonographie", "Schädel-CT nativ", "Röntgen", "Lumbalpunktion"],
        explanation:
          "Bei Verdacht auf subarachnoidale Blutung ist ein natives Schädel-CT die initiale Bildgebung.",
        learningObjective: "",
        examTrap: "",
      }),
      q({
        stem: "Welche Bildgebung wählen Sie?",
        correct: 0,
        opts: ["Schädel-CT nativ", "Herz-MRT", "Abdomen-Sono", "Angiographie", "PET"],
        learningObjective: "",
        examTrap: "",
      }),
      q({
        stem: "Welche frühe Komplikation droht?",
        correct: 0,
        opts: ["Vasospasmus", "Nierenversagen", "Septischer Schock", "Tonsillitis", "Otitis"],
        learningObjective: "",
        examTrap: "",
      }),
    ]
    const hits = detectSpoilers(questions)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h) => h.earlierQuestion === 1 && h.laterQuestion === 2)).toBe(true)
  })

  it("gibt leere Liste bei nur einer Frage zurück", () => {
    const questions: BulkQuestion[] = [
      q({ stem: "Frage?", correct: 0, opts: ["A", "B", "C", "D", "E"], learningObjective: "", examTrap: "" }),
    ]
    expect(detectSpoilers(questions)).toEqual([])
  })

  it("ignoriert Wörter unter Mindestlänge", () => {
    const questions: BulkQuestion[] = [
      q({
        stem: "Säure-Basen-Status?",
        correct: 0,
        opts: ["pH 7,2", "pH 7,4", "pH 7,5", "pH 7,1", "pH 7,3"],
        explanation: "Der pH liegt bei 7,2.",
        learningObjective: "",
        examTrap: "",
      }),
      q({
        stem: "Welche Störung liegt vor?",
        correct: 0,
        opts: [
          "Respiratorische Azidose",
          "Metabolische Alkalose",
          "Respiratorische Alkalose",
          "Metabolische Azidose",
          "Gemischt",
        ],
        learningObjective: "",
        examTrap: "",
      }),
    ]
    const hits = detectSpoilers(questions)
    expect(hits.every((h) => h.terms.every((t) => t.length >= 6))).toBe(true)
  })
})

describe("buildSpoilerRepairHint", () => {
  it("ist leer bei keinen Treffern", () => {
    expect(buildSpoilerRepairHint([])).toBe("")
  })

  it("erwähnt die betroffenen Fragenummern und Begriffe", () => {
    const hint = buildSpoilerRepairHint([
      { earlierQuestion: 1, laterQuestion: 2, terms: ["myokardinfarkt"] },
    ])
    expect(hint).toMatch(/Frage 1/)
    expect(hint).toMatch(/Frage 2/)
    expect(hint).toMatch(/myokardinfarkt/)
    expect(hint).toMatch(/JSON/i)
  })
})
