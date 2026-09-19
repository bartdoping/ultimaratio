import { describe, it, expect, vi } from "vitest"

// Das SDK wird durch eine Attrappe ersetzt, die genau den Fehler wirft, den
// die API bei leerem Guthaben liefert — so lässt sich das Verhalten prüfen,
// ohne einen einzigen echten Aufruf zu machen.
const erstelle = vi.fn()
vi.mock("openai", () => ({
  default: class {
    responses = { create: (...a: unknown[]) => erstelle(...a) }
  },
}))

const guthabenLeer = Object.assign(
  new Error("429 You have no credits remaining. Add credits to continue using the API."),
  { status: 429, code: "insufficient_quota" }
)

describe("Leeres OpenAI-Guthaben", () => {
  it("wird als 'quota' erkannt — nicht als 'ausgelastet'", async () => {
    erstelle.mockReset().mockRejectedValue(guthabenLeer)
    const { callGeneratorModelWithRetry, GeneratorModelError } = await import("../lib/generator-openai")
    const fehler = await callGeneratorModelWithRetry({ instructions: "x", input: "y", maxOutputTokens: 10 }).catch((e) => e)
    expect(fehler).toBeInstanceOf(GeneratorModelError)
    expect(fehler.kind).toBe("quota")
    expect(fehler.message).not.toMatch(/ausgelastet/)
  })

  it("löst weder Wiederholung noch Ersatzmodell aus — genau ein Aufruf", async () => {
    erstelle.mockReset().mockRejectedValue(guthabenLeer)
    const { callGeneratorModelWithRetry } = await import("../lib/generator-openai")
    await callGeneratorModelWithRetry({ instructions: "x", input: "y", maxOutputTokens: 10 }).catch(() => {})
    expect(erstelle).toHaveBeenCalledTimes(1)
  })

  it("behandelt ein echtes Rate-Limit weiterhin als 'ausgelastet'", async () => {
    const rateLimit = Object.assign(new Error("429 Rate limit reached for requests"), { status: 429, code: "rate_limit_exceeded" })
    erstelle.mockReset().mockRejectedValue(rateLimit)
    const { callGeneratorModelWithRetry } = await import("../lib/generator-openai")
    const fehler = await callGeneratorModelWithRetry({ instructions: "x", input: "y", maxOutputTokens: 10 }).catch((e) => e)
    expect(fehler.kind).toBe("rate_limited")
    // Hier sind Wiederholung und Ersatzmodell sinnvoll: mehr als ein Aufruf.
    expect(erstelle.mock.calls.length).toBeGreaterThan(1)
  })
})
