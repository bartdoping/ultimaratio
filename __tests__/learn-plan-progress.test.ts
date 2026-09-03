import { describe, it, expect } from "vitest"
import {
  completionRatio,
  dayForDate,
  daysBetween,
  pickUnusedTopic,
  todayIso,
} from "../lib/learn-plan-progress"
import { generatableTopics, planLastDay } from "../lib/learn-plans"

describe("daysBetween", () => {
  it("zählt Kalendertage", () => {
    expect(daysBetween("2026-09-01", "2026-09-11")).toBe(10)
    expect(daysBetween("2026-09-11", "2026-09-01")).toBe(-10)
    expect(daysBetween("2026-09-01", "2026-09-01")).toBe(0)
  })

  it("zählt über einen Monatswechsel hinweg korrekt", () => {
    expect(daysBetween("2026-01-28", "2026-02-03")).toBe(6)
  })

  it("liefert null bei ungültigem Datum", () => {
    expect(daysBetween("quatsch", "2026-09-01")).toBeNull()
  })
})

describe("dayForDate", () => {
  const letzter = planLastDay("m2") // 85

  it("legt den letzten Plantag auf den Prüfungstermin", () => {
    expect(dayForDate("m2", "2026-09-10", "2026-09-10")).toBe(letzter)
  })

  it("rechnet vom Prüfungstermin zurück", () => {
    expect(dayForDate("m2", "2026-09-10", "2026-09-09")).toBe(letzter - 1)
    expect(dayForDate("m2", "2026-09-10", "2026-08-31")).toBe(letzter - 10)
  })

  it("bleibt bei sehr früher Vorbereitung bei Tag 1", () => {
    expect(dayForDate("m2", "2027-09-10", "2026-09-10")).toBe(1)
  })

  it("bleibt nach dem Termin beim letzten Tag", () => {
    expect(dayForDate("m2", "2026-09-01", "2026-09-20")).toBe(letzter)
  })

  it("berücksichtigt die Länge des jeweiligen Plans", () => {
    // Physikum hat 43 Tage, M2 hat 85 — gleicher Abstand, anderer Tag.
    expect(dayForDate("m1", "2026-09-10", "2026-09-09")).toBe(planLastDay("m1") - 1)
    expect(dayForDate("m1", "2026-09-10", "2026-09-09")).not.toBe(
      dayForDate("m2", "2026-09-10", "2026-09-09")
    )
  })

  it("liefert null bei ungültigem Datum", () => {
    expect(dayForDate("m2", "kein-datum", "2026-09-01")).toBeNull()
  })
})

describe("todayIso", () => {
  it("nutzt die lokale Zeitzone, nicht UTC", () => {
    // 23:30 lokal darf nicht schon der Folgetag sein.
    const spaet = new Date(2026, 8, 3, 23, 30, 0)
    expect(todayIso(spaet)).toBe("2026-09-03")
  })

  it("füllt Monat und Tag zweistellig auf", () => {
    expect(todayIso(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05")
  })
})

describe("pickUnusedTopic", () => {
  const themen = generatableTopics("m2", 25)

  it("zieht ein Thema des richtigen Tages", () => {
    const r = pickUnusedTopic("m2", 25, [])
    expect(r).not.toBeNull()
    expect(themen).toContain(r!.topic)
  })

  it("wiederholt kein Thema, solange noch offene da sind", () => {
    let used: string[] = []
    const gezogen: string[] = []
    for (let i = 0; i < themen.length; i++) {
      const r = pickUnusedTopic("m2", 25, used)
      expect(r).not.toBeNull()
      gezogen.push(r!.topic)
      used = r!.usedAfter
    }
    // Jedes Thema genau einmal.
    expect(new Set(gezogen).size).toBe(themen.length)
  })

  it("beginnt den Zyklus neu, wenn alle Themen durch sind", () => {
    const alleBenutzt = [...themen]
    const r = pickUnusedTopic("m2", 25, alleBenutzt)
    expect(r).not.toBeNull()
    expect(themen).toContain(r!.topic)
    // Merkliste wird zurückgesetzt und wächst nicht unbegrenzt.
    expect(r!.usedAfter).toHaveLength(1)
  })

  it("bleibt bei rand()===1 im gültigen Bereich", () => {
    const r = pickUnusedTopic("m2", 25, [], () => 1)
    expect(themen).toContain(r!.topic)
  })

  it("ist mit injizierter Zufallsquelle deterministisch", () => {
    expect(pickUnusedTopic("m2", 25, [], () => 0)!.topic).toBe(themen[0])
  })

  it("liefert null außerhalb des Tagesbereichs", () => {
    expect(pickUnusedTopic("m2", 0, [])).toBeNull()
    expect(pickUnusedTopic("m2", 999, [])).toBeNull()
  })
})

describe("completionRatio", () => {
  it("ist 0 ohne bearbeitete Tage", () => {
    expect(completionRatio("m1", [])).toBe(0)
  })

  it("zählt jeden Tag nur einmal", () => {
    expect(completionRatio("m1", [3, 3, 3])).toBeCloseTo(1 / planLastDay("m1"))
  })

  it("ignoriert Tage außerhalb des Plans", () => {
    expect(completionRatio("m1", [0, 999, -2])).toBe(0)
  })

  it("erreicht 1 bei vollständigem Plan", () => {
    const alle = Array.from({ length: planLastDay("m1") }, (_, i) => i + 1)
    expect(completionRatio("m1", alle)).toBe(1)
  })
})
