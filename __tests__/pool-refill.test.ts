import { afterEach, describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ default: {} }))
import { globalRefillCap, refillDecision, REFILL_LIMITS } from "@/lib/pool-refill"

describe("refillDecision", () => {
  const basis = { isPro: false, userCount: 0, globalCount: 0, globalCap: 100 }

  it("Free/anonym: frei (begrenzt allein das Kreuz-Kontingent)", () => {
    expect(refillDecision({ ...basis, userCount: 999 })).toEqual({ ok: true })
  })

  it("Pro: eigene Tagesgrenze", () => {
    expect(refillDecision({ ...basis, isPro: true, userCount: REFILL_LIMITS.PRO_PER_DAY - 1 }).ok).toBe(true)
    expect(refillDecision({ ...basis, isPro: true, userCount: REFILL_LIMITS.PRO_PER_DAY })).toEqual({
      ok: false,
      grund: "kapazitaet",
      global: false,
    })
  })

  it("globale Notbremse gilt für alle", () => {
    expect(refillDecision({ ...basis, globalCount: 100 })).toEqual({ ok: false, grund: "kapazitaet", global: true })
  })
})

describe("globalRefillCap", () => {
  afterEach(() => {
    delete process.env.KREUZEN_GEN_DAILY_CAP
  })
  it("Standard und Überschreibung per Umgebungsvariable", () => {
    expect(globalRefillCap()).toBe(REFILL_LIMITS.GLOBAL_PER_DAY_DEFAULT)
    process.env.KREUZEN_GEN_DAILY_CAP = "500"
    expect(globalRefillCap()).toBe(500)
    process.env.KREUZEN_GEN_DAILY_CAP = "kaputt"
    expect(globalRefillCap()).toBe(REFILL_LIMITS.GLOBAL_PER_DAY_DEFAULT)
  })
})
