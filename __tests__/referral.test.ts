import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ default: {} }))
vi.mock("@/lib/product-events", () => ({ track: () => {} }))
import { generateReferralCode, normalizeCode } from "@/lib/referral"
import { extendBonus } from "@/lib/subscription"

describe("Einladungs-Codes", () => {
  it("erzeugt lesbare Codes ohne verwechselbare Zeichen", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateReferralCode()
      expect(c).toMatch(/^[A-HJKMNP-Z2-9]{7}$/)
    }
  })

  it("normalisiert Groß-/Kleinschreibung und lehnt Unsinn ab", () => {
    expect(normalizeCode(" docmax ")).toBe("DOCMAX")
    expect(normalizeCode("ab")).toBeNull()
    expect(normalizeCode("a-b-c")).toBeNull()
    expect(normalizeCode(undefined)).toBeNull()
  })
})

describe("extendBonus", () => {
  const jetzt = new Date("2026-10-23T12:00:00Z")
  it("ab jetzt, wenn nichts läuft", () => {
    expect(extendBonus(null, 30, jetzt).toISOString()).toBe("2026-11-22T12:00:00.000Z")
  })
  it("hängt an laufenden Bonus an", () => {
    expect(extendBonus(new Date("2026-11-01T12:00:00Z"), 30, jetzt).toISOString()).toBe("2026-12-01T12:00:00.000Z")
  })
  it("abgelaufener Bonus zählt nicht", () => {
    expect(extendBonus(new Date("2026-01-01T00:00:00Z"), 1, jetzt).toISOString()).toBe("2026-10-24T12:00:00.000Z")
  })
})

import { passBeginn } from "@/lib/subscription"

describe("passBeginn", () => {
  const jetzt = new Date("2026-10-26T12:00:00Z")
  it("ohne Testphase und Bonus: sofort", () => {
    expect(passBeginn(null, null, jetzt).toISOString()).toBe(jetzt.toISOString())
  })
  it("in der Testphase: erst danach", () => {
    expect(passBeginn(null, new Date("2026-10-30T12:00:00Z"), jetzt).toISOString()).toBe("2026-10-30T12:00:00.000Z")
  })
  it("nach dem späteren von Bonus und Testphase", () => {
    expect(passBeginn(new Date("2026-11-20T00:00:00Z"), new Date("2026-10-30T12:00:00Z"), jetzt).toISOString()).toBe("2026-11-20T00:00:00.000Z")
  })
  it("abgelaufene Testphase zählt nicht", () => {
    expect(passBeginn(null, new Date("2026-10-01T00:00:00Z"), jetzt).toISOString()).toBe(jetzt.toISOString())
  })
})
