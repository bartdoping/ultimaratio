import { describe, it, expect } from "vitest"
import {
  isReasoningModel,
  generatorReasoningEffort,
  generatorVerbosity,
  generatorMaxOutputTokens,
} from "../lib/generator-ai-config"

describe("isReasoningModel", () => {
  it("erkennt GPT-5-Familie und o-Serie als Reasoning-Modelle", () => {
    expect(isReasoningModel("gpt-5.4")).toBe(true)
    expect(isReasoningModel("gpt-5-mini")).toBe(true)
    expect(isReasoningModel("o1")).toBe(true)
    expect(isReasoningModel("o3-mini")).toBe(true)
    expect(isReasoningModel("o4")).toBe(true)
  })

  it("erkennt klassische Modelle NICHT als Reasoning-Modelle", () => {
    expect(isReasoningModel("gpt-4o")).toBe(false)
    expect(isReasoningModel("gpt-4o-mini")).toBe(false)
    expect(isReasoningModel("gpt-4.1")).toBe(false)
  })
})

describe("generatorReasoningEffort", () => {
  function withEnv(value: string | undefined, fn: () => void) {
    const prev = process.env.OPENAI_GENERATOR_REASONING_EFFORT
    if (value === undefined) delete process.env.OPENAI_GENERATOR_REASONING_EFFORT
    else process.env.OPENAI_GENERATOR_REASONING_EFFORT = value
    try {
      fn()
    } finally {
      if (prev === undefined) delete process.env.OPENAI_GENERATOR_REASONING_EFFORT
      else process.env.OPENAI_GENERATOR_REASONING_EFFORT = prev
    }
  }

  it("liefert per Default 'none' – gemessen 30 % schneller ohne Qualitätsverlust", () => {
    withEnv(undefined, () => expect(generatorReasoningEffort()).toBe("none"))
  })

  it("respektiert gültige Overrides", () => {
    withEnv("low", () => expect(generatorReasoningEffort()).toBe("low"))
    withEnv("high", () => expect(generatorReasoningEffort()).toBe("high"))
    withEnv("xhigh", () => expect(generatorReasoningEffort()).toBe("xhigh"))
  })

  it("akzeptiert 'minimal' NICHT – gpt-5.4 lehnt den Wert ab", () => {
    // Regression: Früher war "minimal" erlaubt. Die Responses-API von gpt-5.4
    // antwortet darauf mit `unsupported_value`, wodurch jede Generierung
    // fehlgeschlagen wäre. Zulässig ist stattdessen "none".
    withEnv("minimal", () => expect(generatorReasoningEffort()).toBe("none"))
  })

  it("fällt bei ungültiger Env sicher auf 'none' zurück", () => {
    withEnv("turbo", () => expect(generatorReasoningEffort()).toBe("none"))
  })
})

describe("generatorVerbosity", () => {
  it("liefert per Default 'medium'", () => {
    const prev = process.env.OPENAI_GENERATOR_VERBOSITY
    delete process.env.OPENAI_GENERATOR_VERBOSITY
    expect(generatorVerbosity()).toBe("medium")
    if (prev !== undefined) process.env.OPENAI_GENERATOR_VERBOSITY = prev
  })
})

describe("generatorMaxOutputTokens", () => {
  it("gibt für Fallfragen mehr Budget als für Einzelfragen", () => {
    const single = generatorMaxOutputTokens("single", 1)
    const case3 = generatorMaxOutputTokens("case", 3)
    expect(case3).toBeGreaterThan(single)
  })
})
