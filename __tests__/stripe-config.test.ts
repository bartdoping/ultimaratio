import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  __resetStripeConfigCache,
  assertStripeReadyForCharges,
  getStripeConfig,
  StripeConfigError,
} from "../lib/stripe-config"

type EnvKeys =
  | "STRIPE_SECRET_KEY"
  | "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "STRIPE_PRICE_ID_PRO_MONTHLY"
  | "STRIPE_PRICE_ID"
  | "NODE_ENV"

function setEnv(values: Partial<Record<EnvKeys, string | undefined>>) {
  for (const [k, v] of Object.entries(values) as Array<[EnvKeys, string | undefined]>) {
    if (v === undefined) delete process.env[k]
    else (process.env as Record<string, string>)[k] = v
  }
}

const snapshotKeys: EnvKeys[] = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PRO_MONTHLY",
  "STRIPE_PRICE_ID",
  "NODE_ENV",
]
let snapshot: Record<string, string | undefined> = {}

beforeEach(() => {
  snapshot = {}
  for (const k of snapshotKeys) snapshot[k] = process.env[k]
  __resetStripeConfigCache()
})

afterEach(() => {
  for (const k of snapshotKeys) {
    if (snapshot[k] === undefined) delete process.env[k]
    else (process.env as Record<string, string>)[k] = snapshot[k] as string
  }
  __resetStripeConfigCache()
})

describe("stripe-config: mode detection", () => {
  it("erkennt Test-Mode aus sk_test_…", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_test_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: "price_x",
      NODE_ENV: "development",
    })
    const cfg = getStripeConfig()
    expect(cfg.mode).toBe("test")
    expect(cfg.publishableMode).toBe("test")
    expect(cfg.mixedMode).toBe(false)
  })

  it("erkennt Live-Mode aus sk_live_…", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_live_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: "price_x",
      NODE_ENV: "production",
    })
    const cfg = getStripeConfig()
    expect(cfg.mode).toBe("live")
    expect(cfg.publishableMode).toBe("live")
    expect(cfg.mixedMode).toBe(false)
  })

  it("erkennt gemischten Mode (Live Secret + Test Publishable)", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_live_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: "price_x",
    })
    const cfg = getStripeConfig()
    expect(cfg.mixedMode).toBe(true)
    expect(cfg.issues.some((i) => i.includes("Mixed-Mode"))).toBe(true)
  })

  it("fällt auf legacy STRIPE_PRICE_ID zurück", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_test_abc",
      STRIPE_PRICE_ID: "price_legacy",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: undefined,
    })
    const cfg = getStripeConfig()
    expect(cfg.proMonthlyPriceId).toBe("price_legacy")
  })

  it("issues enthält Hinweise auf fehlende Pflicht-Env", () => {
    setEnv({
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      STRIPE_PRICE_ID_PRO_MONTHLY: undefined,
      STRIPE_PRICE_ID: undefined,
    })
    const cfg = getStripeConfig()
    expect(cfg.issues.length).toBeGreaterThan(0)
  })
})

describe("stripe-config: assertStripeReadyForCharges", () => {
  it("erlaubt vollständige Test-Konfig in Development", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_test_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: "price_x",
      NODE_ENV: "development",
    })
    expect(() => assertStripeReadyForCharges()).not.toThrow()
  })

  it("wirft in Production, wenn kein sk_live_…", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_test_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: "price_x",
      NODE_ENV: "production",
    })
    expect(() => assertStripeReadyForCharges()).toThrow(StripeConfigError)
  })

  it("wirft in Production, wenn Price ID fehlt", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_live_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: undefined,
      STRIPE_PRICE_ID: undefined,
      NODE_ENV: "production",
    })
    expect(() => assertStripeReadyForCharges()).toThrow(StripeConfigError)
  })

  it("wirft in Production bei gemischtem Mode", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_live_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_ID_PRO_MONTHLY: "price_x",
      NODE_ENV: "production",
    })
    expect(() => assertStripeReadyForCharges()).toThrow(StripeConfigError)
  })

  it("wirft in Production, wenn Webhook-Secret fehlt", () => {
    setEnv({
      STRIPE_SECRET_KEY: "sk_live_abc",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc",
      STRIPE_WEBHOOK_SECRET: undefined,
      STRIPE_PRICE_ID_PRO_MONTHLY: "price_x",
      NODE_ENV: "production",
    })
    expect(() => assertStripeReadyForCharges()).toThrow(StripeConfigError)
  })
})
