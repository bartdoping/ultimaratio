import { describe, it, expect } from "vitest"
import { activeUsersPerDay, costPerQuestion, perDay, retention, summarizeCost } from "../lib/metrics"
import { costUsd } from "../lib/ai-usage"

const d = (iso: string) => new Date(iso)

describe("retention", () => {
  const signups = [
    { userId: "a", at: d("2026-10-01T10:00:00Z") },
    { userId: "b", at: d("2026-10-01T22:00:00Z") },
    { userId: "c", at: d("2026-10-01T09:00:00Z") },
  ]
  const activity = [
    { userId: "a", at: d("2026-10-02T08:00:00Z") }, // D1
    { userId: "b", at: d("2026-10-02T23:00:00Z") }, // D1
    { userId: "a", at: d("2026-10-08T08:00:00Z") }, // D7
  ]

  it("berechnet D1 und D7 richtig", () => {
    const r = retention(signups, activity, [1, 7], d("2026-10-20T00:00:00Z"))
    expect(r[1]).toEqual({ quote: 2 / 3, basis: 3 })
    expect(r[7]).toEqual({ quote: 1 / 3, basis: 3 })
  })

  it("zählt Kohorten nicht, deren Tag N noch läuft oder in der Zukunft liegt", () => {
    const r = retention(signups, activity, [1, 30], d("2026-10-02T12:00:00Z"))
    expect(r[1].basis).toBe(0)
    expect(r[1].quote).toBeNull()
    expect(r[30].basis).toBe(0)
  })
})

describe("Kosten", () => {
  const preise = { "m-a": { input: 1, cached: 0.1, output: 10 } }

  it("rechnet ungecachte, gecachte und Ausgabe-Tokens getrennt", () => {
    // 1.000.000 Input davon 400.000 gecacht, 100.000 Output:
    // 600k × 1 + 400k × 0,1 + 100k × 10 = 0,6 + 0,04 + 1,0 = 1,64 USD
    expect(costUsd("m-a", { inputTokens: 1_000_000, cachedTokens: 400_000, outputTokens: 100_000 }, preise)).toBeCloseTo(1.64)
  })

  it("liefert null für ein Modell ohne Preis — nie eine erfundene Zahl", () => {
    expect(costUsd("unbekannt", { inputTokens: 10, cachedTokens: 0, outputTokens: 10 }, preise)).toBeNull()
  })

  it("weist Aufrufe ohne Preis getrennt aus", () => {
    const rows = [
      { createdAt: d("2026-10-01T00:00:00Z"), purpose: "draft", model: "m-a", inputTokens: 1_000_000, cachedTokens: 0, outputTokens: 0, userId: null },
      { createdAt: d("2026-10-01T00:00:00Z"), purpose: "enrich", model: "terra", inputTokens: 5, cachedTokens: 0, outputTokens: 5, userId: null },
    ]
    const s = summarizeCost(rows, preise)
    expect(s.usd).toBeCloseTo(1)
    expect(s.callsOhnePreis).toBe(1)
    expect(s.modelleOhnePreis).toEqual(["terra"])
    expect(s.nachZweck.draft.calls).toBe(1)
  })

  it("teilt Kosten durch ausgelieferte Fragen", () => {
    expect(costPerQuestion(2, 400)).toBeCloseTo(0.005)
    expect(costPerQuestion(2, 0)).toBeNull()
  })
})

describe("Tagesreihen", () => {
  const jetzt = d("2026-10-03T12:00:00Z")
  it("füllt Tage ohne Ereignis mit 0", () => {
    const r = perDay([{ createdAt: d("2026-10-03T01:00:00Z") }], 3, jetzt)
    expect(r).toEqual([
      { tag: "2026-10-01", wert: 0 },
      { tag: "2026-10-02", wert: 0 },
      { tag: "2026-10-03", wert: 1 },
    ])
  })

  it("zählt aktive Nutzer je Tag nur einmal", () => {
    const r = activeUsersPerDay(
      [
        { createdAt: d("2026-10-03T01:00:00Z"), userId: "a" },
        { createdAt: d("2026-10-03T05:00:00Z"), userId: "a" },
        { createdAt: d("2026-10-03T06:00:00Z"), userId: null },
      ],
      1,
      jetzt
    )
    expect(r).toEqual([{ tag: "2026-10-03", wert: 1 }])
  })
})
