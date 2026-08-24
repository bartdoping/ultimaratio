import { describe, it, expect } from "vitest"
import {
  LEARN_PLANS,
  LEARN_PLAN_IDS,
  generatableTopics,
  getLearnPlanDay,
  getPlan,
  isGeneratableTopic,
  isLearnPlanId,
  pickRandomTopic,
  planLastDay,
  type LearnPlanId,
} from "../lib/learn-plans"

const ALL: LearnPlanId[] = ["m2", "m1"]

describe("Registry", () => {
  it("enthält beide Pläne in definierter Reihenfolge", () => {
    expect(LEARN_PLAN_IDS).toEqual(["m2", "m1"])
    expect(getPlan("m2").label).toMatch(/M2/)
    expect(getPlan("m1").label).toMatch(/Physikum/)
  })

  it("erkennt gültige Plan-IDs", () => {
    expect(isLearnPlanId("m1")).toBe(true)
    expect(isLearnPlanId("m2")).toBe(true)
    expect(isLearnPlanId("m3")).toBe(false)
    expect(isLearnPlanId(undefined)).toBe(false)
  })

  it("hat die erwarteten Tageszahlen", () => {
    expect(planLastDay("m2")).toBe(85)
    expect(planLastDay("m1")).toBe(43)
  })
})

describe.each(ALL)("Datenintegrität – Plan %s", (planId) => {
  const plan = LEARN_PLANS[planId]

  it("ist lückenlos ab Tag 1 nummeriert", () => {
    plan.days.forEach((d, i) => expect(d.day).toBe(i + 1))
  })

  it("gibt jedem Tag ein Fachgebiet und mindestens ein Thema", () => {
    for (const d of plan.days) {
      expect(d.subject.trim().length).toBeGreaterThan(0)
      expect(d.topics.length).toBeGreaterThan(0)
    }
  })

  it("lässt keinen Tag ohne generierbares Thema zurück", () => {
    for (const d of plan.days) {
      expect(generatableTopics(planId, d.day).length).toBeGreaterThan(0)
    }
  })

  it("enthält keine Themen-Duplikate innerhalb eines Tages", () => {
    for (const d of plan.days) {
      expect(new Set(d.topics).size).toBe(d.topics.length)
    }
  })

  it("enthält keine Kopfhörer-Marker, Nummerierung oder Randleerzeichen", () => {
    for (const d of plan.days) {
      for (const t of d.topics) {
        expect(t).not.toMatch(/🎧/)
        expect(t).not.toMatch(/^\d+\.\s/)
        expect(t).toBe(t.trim())
      }
    }
  })

  it("zieht ausschließlich generierbare Themen des jeweiligen Tages", () => {
    for (const d of plan.days) {
      for (let i = 0; i < 12; i++) {
        const t = pickRandomTopic(planId, d.day, () => i / 12)
        expect(t).not.toBeNull()
        expect(isGeneratableTopic(t as string)).toBe(true)
        expect(d.topics).toContain(t as string)
      }
    }
  })

  it("liefert null außerhalb des Tagesbereichs", () => {
    expect(getLearnPlanDay(planId, 0)).toBeNull()
    expect(getLearnPlanDay(planId, planLastDay(planId) + 1)).toBeNull()
    expect(getLearnPlanDay(planId, 1.5)).toBeNull()
    expect(pickRandomTopic(planId, 0)).toBeNull()
  })
})

describe("isGeneratableTopic", () => {
  it("filtert Meta- und Navigationseinträge beider Pläne", () => {
    expect(isGeneratableTopic("Handbuch – Vorbereitung auf das Zweite Staatsexamen")).toBe(false)
    expect(isGeneratableTopic("Handbuch – Vorbereitung auf das Erste Staatsexamen / Physikum")).toBe(false)
    expect(isGeneratableTopic("Kreuztipps zum Ersten Staatsexamen")).toBe(false)
    expect(isGeneratableTopic("Kreuztipps zum Zweiten Staatsexamen")).toBe(false)
    expect(isGeneratableTopic("Sammelsurium der HNO")).toBe(false)
    expect(isGeneratableTopic("Zweites Staatsexamen")).toBe(false)
    expect(isGeneratableTopic("Erstes Staatsexamen (schriftlicher Teil)")).toBe(false)
    expect(isGeneratableTopic("Erstes Staatsexamen (mündlicher Teil)")).toBe(false)
  })

  it("lässt echte Fachthemen durch", () => {
    expect(isGeneratableTopic("Lyme-Borreliose")).toBe(true)
    expect(isGeneratableTopic("Citratzyklus")).toBe(true)
    expect(isGeneratableTopic("Ruhe- und Aktionspotential")).toBe(true)
  })

  it("filtert genau die erwartete Anzahl je Plan", () => {
    const gefiltert = (id: LearnPlanId) =>
      LEARN_PLANS[id].days.flatMap((d) => d.topics).filter((t) => !isGeneratableTopic(t))
    expect(gefiltert("m2")).toHaveLength(8)
    // Physikum: Handbuch, Kreuztipps, Examen schriftlich, Examen mündlich
    expect(gefiltert("m1")).toHaveLength(4)
  })
})

describe("Physikum-Plan – inhaltliche Stichproben", () => {
  it("bildet bekannte Tage korrekt ab", () => {
    expect(getLearnPlanDay("m1", 1)?.subject).toMatch(/Zellbiologie/)
    expect(getLearnPlanDay("m1", 15)?.topics).toContain("Citratzyklus")
    expect(getLearnPlanDay("m1", 32)?.topics).toEqual(["Schädel", "Hirnnerven"])
    expect(getLearnPlanDay("m1", 43)?.topics).toContain("Umgang mit dem Sterben")
  })

  it("trennt die in der Vorlage zusammengelaufenen Themen", () => {
    // Tag 18: "Atemwege und Lunge Atemmechanik" waren zwei Themen.
    const t18 = getLearnPlanDay("m1", 18)!.topics
    expect(t18).toContain("Atemwege und Lunge")
    expect(t18).toContain("Atemmechanik")
    expect(t18.some((t) => /Lunge Atemmechanik/.test(t))).toBe(false)

    // Tag 23: "Säure-Base-Haushalt Harnleiter" waren zwei Themen.
    const t23 = getLearnPlanDay("m1", 23)!.topics
    expect(t23).toContain("Säure-Base-Haushalt")
    expect(t23).toContain("Harnleiter")
    expect(t23.some((t) => /Haushalt Harnleiter/.test(t))).toBe(false)
  })
})

describe("pickRandomTopic", () => {
  it("ist mit injizierter Zufallsquelle deterministisch", () => {
    expect(pickRandomTopic("m1", 15, () => 0)).toBe(generatableTopics("m1", 15)[0])
    const letzte = generatableTopics("m1", 15).slice(-1)[0]
    expect(pickRandomTopic("m1", 15, () => 0.999999)).toBe(letzte)
  })

  it("bleibt bei rand()===1 im gültigen Bereich", () => {
    const t = pickRandomTopic("m1", 26, () => 1)
    expect(generatableTopics("m1", 26)).toContain(t as string)
  })

  it("streut über mehrere Themen", () => {
    const gezogen = new Set<string>()
    for (let i = 0; i < 400; i++) gezogen.add(pickRandomTopic("m1", 26) as string)
    expect(gezogen.size).toBeGreaterThan(5)
  })

  it("hält die Pläne auseinander", () => {
    // Tag 25 existiert in beiden Plänen mit unterschiedlichem Inhalt.
    const m2 = generatableTopics("m2", 25)
    const m1 = generatableTopics("m1", 25)
    expect(m2).toContain("Lyme-Borreliose")
    expect(m1).toContain("Nebenniere")
    expect(m2.some((t) => m1.includes(t))).toBe(false)
  })
})
