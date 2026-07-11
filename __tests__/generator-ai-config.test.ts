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
  it("liefert per Default 'low' (Latenzoptimierung)", () => {
    const prev = process.env.OPENAI_GENERATOR_REASONING_EFFORT
    delete process.env.OPENAI_GENERATOR_REASONING_EFFORT
    expect(generatorReasoningEffort()).toBe("low")
    if (prev !== undefined) process.env.OPENAI_GENERATOR_REASONING_EFFORT = prev
  })

  it("respektiert eine gültige Env-Override", () => {
    const prev = process.env.OPENAI_GENERATOR_REASONING_EFFORT
    process.env.OPENAI_GENERATOR_REASONING_EFFORT = "minimal"
    expect(generatorReasoningEffort()).toBe("minimal")
    if (prev === undefined) delete process.env.OPENAI_GENERATOR_REASONING_EFFORT
    else process.env.OPENAI_GENERATOR_REASONING_EFFORT = prev
  })

  it("fällt bei ungültiger Env auf 'low' zurück", () => {
    const prev = process.env.OPENAI_GENERATOR_REASONING_EFFORT
    process.env.OPENAI_GENERATOR_REASONING_EFFORT = "turbo"
    expect(generatorReasoningEffort()).toBe("low")
    if (prev === undefined) delete process.env.OPENAI_GENERATOR_REASONING_EFFORT
    else process.env.OPENAI_GENERATOR_REASONING_EFFORT = prev
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
