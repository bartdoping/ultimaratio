import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/stripe", () => ({ default: {} }))
import { bestaetigungsText } from "@/lib/vertragsbestaetigung"

const jetzt = new Date("2026-10-25T10:00:00Z")

describe("Vertragsbestätigung (§ 312f BGB)", () => {
  it("Monatsabo: Preis, Laufzeit, Kündigungsweg, Widerruf, Anbieter", () => {
    const { subject, text } = bestaetigungsText({ plan: "pro_monthly", betragCents: 999, waehrung: "eur", endetAm: null, jetzt })
    expect(subject).toContain("Pro-Monatsabo")
    expect(text.replace(/\s/g, " ")).toContain("9,99 € pro Monat")
    expect(text).toContain("/kuendigung")
    expect(text).toContain("14 Tage")
    expect(text).toContain("§ 19 UStG")
    expect(text).toContain("Hallesche Straße 94a")
  })

  it("Pass: einmalig, Enddatum, keine Verlängerung", () => {
    const { text } = bestaetigungsText({
      plan: "exam_pass",
      betragCents: 2499,
      waehrung: "eur",
      endetAm: new Date("2027-01-23T10:00:00Z"),
      jetzt,
    })
    expect(text.replace(/\s/g, " ")).toContain("24,99 € einmalig")
    expect(text).toContain("23. Januar 2027")
    expect(text).toContain("keine Verlängerung")
    expect(text).not.toContain("/kuendigung")
  })

  it("Pass mit ausstehender Zahlung (z. B. SEPA)", () => {
    const { text } = bestaetigungsText({ plan: "year_pass", betragCents: 7999, waehrung: "eur", endetAm: null, jetzt })
    expect(text).toContain("ab Zahlungseingang")
  })
})
