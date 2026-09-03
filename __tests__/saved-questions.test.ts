import { describe, it, expect } from "vitest"
import {
  MS_PRO_TAG,
  istFaellig,
  nextReviewState,
  payloadToQuestion,
  themenBilanz,
  trefferquote,
} from "../lib/saved-questions"

const JETZT = new Date("2026-09-03T10:00:00Z")
const tageSpaeter = (d: Date, tage: number) =>
  Math.round((d.getTime() - JETZT.getTime()) / MS_PRO_TAG) === tage

describe("nextReviewState", () => {
  const frisch = { attempts: 0, correctCount: 0, streak: 0 }

  it("legt eine falsch beantwortete Frage auf morgen", () => {
    const r = nextReviewState(frisch, false, JETZT)
    expect(r.lastCorrect).toBe(false)
    expect(r.streak).toBe(0)
    expect(tageSpaeter(r.dueAt, 1)).toBe(true)
  })

  it("verlängert den Abstand mit jeder richtigen Antwort", () => {
    let s = { attempts: 0, correctCount: 0, streak: 0 }
    const abstaende: number[] = []
    for (let i = 0; i < 5; i++) {
      const r = nextReviewState(s, true, JETZT)
      abstaende.push(Math.round((r.dueAt.getTime() - JETZT.getTime()) / MS_PRO_TAG))
      s = { attempts: r.attempts, correctCount: r.correctCount, streak: r.streak }
    }
    expect(abstaende).toEqual([3, 7, 21, 60, 60])
  })

  it("setzt die Serie bei einem Fehler zurück", () => {
    const nachDrei = { attempts: 3, correctCount: 3, streak: 3 }
    const r = nextReviewState(nachDrei, false, JETZT)
    expect(r.streak).toBe(0)
    expect(tageSpaeter(r.dueAt, 1)).toBe(true)
  })

  it("zählt Versuche und Treffer korrekt", () => {
    const r1 = nextReviewState(frisch, true, JETZT)
    expect(r1).toMatchObject({ attempts: 1, correctCount: 1 })
    const r2 = nextReviewState(r1, false, JETZT)
    expect(r2).toMatchObject({ attempts: 2, correctCount: 1 })
  })

  it("hält lastAnsweredAt fest", () => {
    expect(nextReviewState(frisch, true, JETZT).lastAnsweredAt).toEqual(JETZT)
  })
})

describe("istFaellig", () => {
  it("ist fällig, wenn der Termin erreicht ist", () => {
    expect(istFaellig(new Date(JETZT.getTime() - 1000), JETZT)).toBe(true)
    expect(istFaellig(JETZT, JETZT)).toBe(true)
  })

  it("ist nicht fällig, wenn der Termin in der Zukunft liegt", () => {
    expect(istFaellig(new Date(JETZT.getTime() + 1000), JETZT)).toBe(false)
  })

  it("gilt für nie beantwortete Fragen nicht als fällig", () => {
    expect(istFaellig(null, JETZT)).toBe(false)
    expect(istFaellig(undefined, JETZT)).toBe(false)
  })
})

describe("trefferquote", () => {
  it("rechnet in Prozent", () => {
    expect(trefferquote(4, 3)).toBe(75)
    expect(trefferquote(3, 1)).toBe(33)
  })

  it("liefert null ohne Versuch", () => {
    expect(trefferquote(0, 0)).toBeNull()
  })
})

describe("themenBilanz", () => {
  it("fasst mehrere Fragen desselben Themas zusammen", () => {
    const b = themenBilanz([
      { topic: "Kardiologie", attempts: 2, correctCount: 2 },
      { topic: "Kardiologie", attempts: 2, correctCount: 0 },
    ])
    expect(b).toEqual([{ topic: "Kardiologie", attempts: 4, correctCount: 2, quote: 50 }])
  })

  it("sortiert das schwächste Thema nach vorn", () => {
    const b = themenBilanz([
      { topic: "Stark", attempts: 4, correctCount: 4 },
      { topic: "Schwach", attempts: 4, correctCount: 1 },
      { topic: "Mittel", attempts: 4, correctCount: 2 },
    ])
    expect(b.map((x) => x.topic)).toEqual(["Schwach", "Mittel", "Stark"])
  })

  it("blendet Themen ohne Antwort aus, statt 0 % zu behaupten", () => {
    const b = themenBilanz([{ topic: "Unberührt", attempts: 0, correctCount: 0 }])
    expect(b).toEqual([])
  })
})

describe("payloadToQuestion", () => {
  const gut = {
    stem: "Welche Akuttherapie ist indiziert?",
    caseVignette: null,
    explanation: "Ausführlich.",
    keyTakeaway: "Kern.",
    mustKnow: "Cut-Off.",
    mnemonic: "",
    highYield: ["A", "B"],
    options: [
      { text: "rtPA", isCorrect: true, explanation: "richtig weil" },
      { text: "Heparin", isCorrect: false, explanation: "falsch weil" },
    ],
  }

  it("stellt eine gespeicherte Frage wieder her", () => {
    const q = payloadToQuestion(gut)
    expect(q).not.toBeNull()
    expect(q!.stem).toBe(gut.stem)
    expect(q!.options).toHaveLength(2)
    expect(q!.options[0].isCorrect).toBe(true)
    expect(q!.allowImmediate).toBe(true)
  })

  it("weist kaputte Datensätze ab, statt die Liste zu sprengen", () => {
    expect(payloadToQuestion(null)).toBeNull()
    expect(payloadToQuestion("text")).toBeNull()
    expect(payloadToQuestion({ ...gut, stem: "" })).toBeNull()
    expect(payloadToQuestion({ ...gut, options: [] })).toBeNull()
  })

  it("weist Fragen ohne genau eine richtige Antwort ab", () => {
    expect(
      payloadToQuestion({
        ...gut,
        options: [
          { text: "a", isCorrect: true },
          { text: "b", isCorrect: true },
        ],
      })
    ).toBeNull()
    expect(
      payloadToQuestion({
        ...gut,
        options: [
          { text: "a", isCorrect: false },
          { text: "b", isCorrect: false },
        ],
      })
    ).toBeNull()
  })

  it("verkraftet fehlende Erklärungsfelder", () => {
    const q = payloadToQuestion({
      stem: "Frage?",
      options: [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: false },
      ],
    })
    expect(q).not.toBeNull()
    expect(q!.explanation).toBeNull()
    expect(q!.highYield).toBeNull()
  })
})
