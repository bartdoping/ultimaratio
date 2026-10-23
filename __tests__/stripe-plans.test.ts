import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/stripe", () => ({ default: {} }))
import { formatAmount, isPlanId, yearlySavingPercent } from "@/lib/stripe-plans"

describe("Tarife", () => {
  it("kennt nur gültige Tarife", () => {
    expect(isPlanId("pro_yearly")).toBe(true)
    expect(isPlanId("exam_pass")).toBe(true)
    expect(isPlanId("gratis_fuer_immer")).toBe(false)
  })

  it("rechnet die Jahresersparnis ehrlich", () => {
    expect(yearlySavingPercent(999, 7999)).toBe(33)
    expect(yearlySavingPercent(999, 11988)).toBeNull()
    expect(yearlySavingPercent(null, 7999)).toBeNull()
  })

  it("formatiert Beträge deutsch", () => {
    expect(formatAmount(999).replace(/\s/g, " ")).toBe("9,99 €")
    expect(formatAmount(null)).toBe("")
  })
})
