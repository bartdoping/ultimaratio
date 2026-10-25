import { describe, expect, it } from "vitest"
import { rundeFaellig, rundenBilanz, serie, serienMeilenstein, stufenVorschlag } from "@/lib/kreuzen-flow"

const R = true
const F = false

describe("serie", () => {
  it("zählt richtig und falsch in Folge", () => {
    expect(serie([])).toBe(0)
    expect(serie([F, R, R, R])).toBe(3)
    expect(serie([R, F, F])).toBe(-2)
  })
})

describe("serienMeilenstein", () => {
  it("feiert 3, 5, 10 und dann alle 5", () => {
    expect([2, 3, 4, 5, 10, 12, 15, 20].map(serienMeilenstein)).toEqual([null, 3, null, 5, 10, null, 15, 20])
  })
})

describe("stufenVorschlag", () => {
  it("schwerer nach 5 richtigen", () => {
    expect(stufenVorschlag([R, R, R, R, R], 3, new Set())).toEqual({ richtung: "schwerer", stufe: 4 })
    expect(stufenVorschlag([R, R, R, R], 3, new Set())).toBeNull()
  })
  it("nur beim Erreichen der Schwelle, nicht bei jeder weiteren Antwort", () => {
    expect(stufenVorschlag([R, R, R, R, R, R], 3, new Set())).toBeNull()
    expect(stufenVorschlag(Array(10).fill(R), 3, new Set())).toEqual({ richtung: "schwerer", stufe: 4 })
  })
  it("leichter nach 3 falschen", () => {
    expect(stufenVorschlag([R, F, F, F], 3, new Set())).toEqual({ richtung: "leichter", stufe: 2 })
  })
  it("nicht über die Ränder und nicht erneut nach Ablehnung", () => {
    expect(stufenVorschlag([R, R, R, R, R], 5, new Set())).toBeNull()
    expect(stufenVorschlag([F, F, F], 1, new Set())).toBeNull()
    expect(stufenVorschlag([R, R, R, R, R], 3, new Set([4]))).toBeNull()
  })
})

describe("Runden", () => {
  it("alle 10 Fragen genau einmal", () => {
    expect(rundeFaellig(10, 0)).toBe(true)
    expect(rundeFaellig(10, 10)).toBe(false)
    expect(rundeFaellig(11, 10)).toBe(false)
    expect(rundeFaellig(20, 10)).toBe(true)
  })
  it("bilanziert nur die letzte Runde", () => {
    const e = [F, F, F, F, F, R, R, R, F, R, R, R, R, F, R]
    expect(rundenBilanz(e)).toEqual({ richtig: 8, gesamt: 10, besteSerie: 4 })
  })
})
