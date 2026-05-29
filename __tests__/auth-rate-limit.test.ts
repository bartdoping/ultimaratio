import { describe, it, expect, beforeEach } from "vitest"
import {
  AUTH_BUCKETS,
  __resetAuthRateLimit,
  tryAcquireAuth,
} from "../lib/auth-rate-limit"

describe("auth-rate-limit", () => {
  beforeEach(() => {
    __resetAuthRateLimit()
  })

  it("erlaubt bis zum Max-Wert eines Buckets", () => {
    const { max } = AUTH_BUCKETS.checkEmail
    const now = 1_000_000
    for (let i = 0; i < max; i++) {
      expect(tryAcquireAuth("checkEmail", "ip|mail", now + i).ok).toBe(true)
    }
    expect(tryAcquireAuth("checkEmail", "ip|mail", now + max).ok).toBe(false)
  })

  it("setzt das Fenster nach Ablauf zurück", () => {
    const { windowMs, max } = AUTH_BUCKETS.register
    const start = 5_000_000
    for (let i = 0; i < max; i++) {
      expect(tryAcquireAuth("register", "ip|mail", start).ok).toBe(true)
    }
    expect(tryAcquireAuth("register", "ip|mail", start + windowMs - 1).ok).toBe(false)
    expect(tryAcquireAuth("register", "ip|mail", start + windowMs + 1).ok).toBe(true)
  })

  it("verschiedene Buckets sind unabhängig", () => {
    const now = 10_000_000
    for (let i = 0; i < AUTH_BUCKETS.codeResend.max; i++) {
      tryAcquireAuth("codeResend", "ip|mail", now)
    }
    expect(tryAcquireAuth("codeResend", "ip|mail", now).ok).toBe(false)
    expect(tryAcquireAuth("codeVerify", "ip|mail", now).ok).toBe(true)
  })

  it("leerer Key wird nicht limitiert", () => {
    for (let i = 0; i < 100; i++) {
      expect(tryAcquireAuth("checkEmail", "", 1000 + i).ok).toBe(true)
    }
  })

  it("retryAfterMs bei Block ist > 0 und ≤ windowMs", () => {
    const { max, windowMs } = AUTH_BUCKETS.codeVerify
    const now = 20_000_000
    for (let i = 0; i < max; i++) {
      tryAcquireAuth("codeVerify", "ip|mail", now)
    }
    const r = tryAcquireAuth("codeVerify", "ip|mail", now + 1000)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.retryAfterMs).toBeGreaterThan(0)
      expect(r.retryAfterMs).toBeLessThanOrEqual(windowMs)
    }
  })
})
