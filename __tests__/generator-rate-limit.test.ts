import { describe, it, expect, beforeEach } from "vitest"
import {
  GENERATOR_MIN_INTERVAL_MS,
  __resetGeneratorRateLimit,
  rateLimitKeyFor,
  tryAcquireGeneratorSlot,
} from "../lib/generator-rate-limit"

describe("generator-rate-limit", () => {
  beforeEach(() => {
    __resetGeneratorRateLimit()
  })

  it("erster Aufruf wird erlaubt", () => {
    const r = tryAcquireGeneratorSlot("u:abc", 1_000_000)
    expect(r.ok).toBe(true)
  })

  it("zweiter Aufruf innerhalb des Fensters wird blockiert", () => {
    tryAcquireGeneratorSlot("u:abc", 1_000_000)
    const r = tryAcquireGeneratorSlot("u:abc", 1_000_000 + 5_000)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.retryAfterMs).toBeLessThanOrEqual(GENERATOR_MIN_INTERVAL_MS - 5_000)
      expect(r.retryAfterMs).toBeGreaterThan(0)
    }
  })

  it("nach Ablauf des Fensters wieder erlaubt", () => {
    tryAcquireGeneratorSlot("u:abc", 1_000_000)
    const r = tryAcquireGeneratorSlot("u:abc", 1_000_000 + GENERATOR_MIN_INTERVAL_MS + 1)
    expect(r.ok).toBe(true)
  })

  it("verschiedene Keys behindern sich nicht", () => {
    tryAcquireGeneratorSlot("u:alice", 1_000_000)
    const r = tryAcquireGeneratorSlot("u:bob", 1_000_000 + 1)
    expect(r.ok).toBe(true)
  })

  it("leerer Key wird nicht limitiert", () => {
    const r1 = tryAcquireGeneratorSlot("", 1_000_000)
    const r2 = tryAcquireGeneratorSlot("", 1_000_001)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
  })

  it("rateLimitKeyFor bevorzugt userId, dann anonKey, dann ipHash", () => {
    expect(rateLimitKeyFor({ userId: "u1", anonKey: "a1", ipHash: "i1" })).toBe("u:u1")
    expect(rateLimitKeyFor({ userId: null, anonKey: "a1", ipHash: "i1" })).toBe("a:a1")
    expect(rateLimitKeyFor({ userId: null, anonKey: null, ipHash: "i1" })).toBe("i:i1")
    expect(rateLimitKeyFor({ userId: null, anonKey: null, ipHash: null })).toBe("")
  })
})
