import { describe, it, expect } from "vitest"
import {
  LEARN_PLAN_M2,
  LEARN_PLAN_FIRST_DAY,
  LEARN_PLAN_LAST_DAY,
  generatableTopics,
  getLearnPlanDay,
  isGeneratableTopic,
  pickRandomTopic,
} from "../lib/learn-plan-m2"

describe("Datenintegrität des Lernplans", () => {
  it("umfasst 85 lückenlos nummerierte Tage", () => {
    expect(LEARN_PLAN_LAST_DAY).toBe(85)
    LEARN_PLAN_M2.forEach((d, i) => expect(d.day).toBe(i + 1))
  })

  it("gibt jedem Tag ein Fachgebiet und mindestens ein Thema", () => {
    for (const d of LEARN_PLAN_M2) {
      expect(d.subject.trim().length).toBeGreaterThan(0)
      expect(d.topics.length).toBeGreaterThan(0)
    }
  })

  it("lässt keinen Tag ohne generierbares Thema zurück", () => {
    for (const d of LEARN_PLAN_M2) {
      expect(generatableTopics(d.day).length).toBeGreaterThan(0)
    }
  })

  it("enthält keine Themen-Duplikate innerhalb eines Tages", () => {
    for (const d of LEARN_PLAN_M2) {
      expect(new Set(d.topics).size).toBe(d.topics.length)
    }
  })

  it("enthält keine Kopfhörer-Marker oder führende Nummerierung", () => {
    for (const d of LEARN_PLAN_M2) {
      for (const t of d.topics) {
        expect(t).not.toMatch(/🎧/)
        expect(t).not.toMatch(/^\d+\.\s/)
        expect(t).toBe(t.trim())
      }
    }
  })
})

describe("isGeneratableTopic", () => {
  it("filtert Meta- und Navigationseinträge", () => {
    expect(isGeneratableTopic("Handbuch – Vorbereitung auf das Zweite Staatsexamen")).toBe(false)
    expect(isGeneratableTopic("Kreuztipps zum Zweiten Staatsexamen")).toBe(false)
    expect(isGeneratableTopic("Sammelsurium der HNO")).toBe(false)
    expect(isGeneratableTopic("Zweites Staatsexamen")).toBe(false)
    expect(isGeneratableTopic("Tag 79 M2-Lernplan – Wiederholung des Querschnittbereichs Radiologie")).toBe(false)
  })

  it("lässt echte Fachthemen durch", () => {
    expect(isGeneratableTopic("Lyme-Borreliose")).toBe(true)
    expect(isGeneratableTopic("Akutes Koronarsyndrom")).toBe(true)
    expect(isGeneratableTopic("Guillain-Barré-Syndrom")).toBe(true)
  })

  it("filtert genau 8 Einträge im Gesamtplan", () => {
    const alle = LEARN_PLAN_M2.flatMap((d) => d.topics)
    const gefiltert = alle.filter((t) => !isGeneratableTopic(t))
    expect(gefiltert).toHaveLength(8)
  })
})

describe("getLearnPlanDay", () => {
  it("liefert den passenden Tag", () => {
    const d = getLearnPlanDay(25)
    expect(d?.subject).toBe("Infektiologie und Hygiene")
    expect(d?.topics).toContain("Lyme-Borreliose")
  })

  it("liefert null außerhalb des Bereichs", () => {
    expect(getLearnPlanDay(0)).toBeNull()
    expect(getLearnPlanDay(86)).toBeNull()
    expect(getLearnPlanDay(1.5)).toBeNull()
    expect(getLearnPlanDay(NaN)).toBeNull()
  })

  it("deckt bekannte Eckpunkte ab", () => {
    expect(getLearnPlanDay(LEARN_PLAN_FIRST_DAY)?.subject).toBe("Kardiologie und Angiologie")
    expect(getLearnPlanDay(65)?.topics).toContain("Ischämischer Schlaganfall")
    expect(getLearnPlanDay(78)?.topics).toContain("Antibiotika")
  })
})

describe("pickRandomTopic", () => {
  it("wählt ausschließlich generierbare Themen des Tages", () => {
    // Tag 1 enthält zwei Meta-Einträge, die nie gezogen werden dürfen.
    for (let i = 0; i < 200; i++) {
      const t = pickRandomTopic(1, () => i / 200)
      expect(t).not.toBeNull()
      expect(isGeneratableTopic(t as string)).toBe(true)
      expect(getLearnPlanDay(1)!.topics).toContain(t as string)
    }
  })

  it("ist mit injizierter Zufallsquelle deterministisch", () => {
    expect(pickRandomTopic(25, () => 0)).toBe(generatableTopics(25)[0])
    const letzte = generatableTopics(25).slice(-1)[0]
    expect(pickRandomTopic(25, () => 0.999999)).toBe(letzte)
  })

  it("bleibt bei rand()===1 im gültigen Bereich", () => {
    // Math.random() liefert nie exakt 1, aber der Code muss es aushalten.
    const t = pickRandomTopic(25, () => 1)
    expect(generatableTopics(25)).toContain(t as string)
  })

  it("liefert null für ungültige Tage", () => {
    expect(pickRandomTopic(0)).toBeNull()
    expect(pickRandomTopic(999)).toBeNull()
  })

  it("streut über mehrere Themen statt immer dasselbe zu liefern", () => {
    const gezogen = new Set<string>()
    for (let i = 0; i < 400; i++) gezogen.add(pickRandomTopic(25) as string)
    expect(gezogen.size).toBeGreaterThan(5)
  })
})
