import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ default: {} }))
import { seedJobs, seedTopics } from "@/lib/pool-seed"

describe("seedTopics", () => {
  it("liefert jedes Thema nur einmal, mit dem Abschnitt seines Plans", () => {
    const t = seedTopics()
    expect(new Set(t.map((x) => x.topicKey)).size).toBe(t.length)
    expect(t.find((x) => x.plan === "m1")?.section).toBe("vorklinik")
    expect(t.find((x) => x.plan === "m2")?.section).toBe("klinik")
  })
})

describe("seedJobs", () => {
  const topics = [
    { topic: "A", topicKey: "a", section: "klinik" as const, plan: "m2" as const },
    { topic: "B", topicKey: "b", section: "klinik" as const, plan: "m2" as const },
  ]

  it("erzeugt nur, was bis zur Zielmenge fehlt (fortsetzbar)", () => {
    const jobs = seedJobs(topics, new Map([["a|3", 1]]), [3], 1)
    expect(jobs).toEqual([{ topic: "B", section: "klinik", difficulty: 3 }])
  })

  it("deckt erst jedes Thema einmal ab, dann die zweite Runde", () => {
    const jobs = seedJobs(topics, new Map(), [3], 2)
    expect(jobs.map((j) => j.topic)).toEqual(["A", "B", "A", "B"])
  })
})
