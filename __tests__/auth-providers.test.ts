import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  buildOAuthProviders,
  listConfiguredOAuthProviders,
} from "../lib/auth-providers"

const KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APPLE_CLIENT_ID",
  "APPLE_CLIENT_SECRET",
  "FACEBOOK_CLIENT_ID",
  "FACEBOOK_CLIENT_SECRET",
  "AZURE_AD_CLIENT_ID",
  "AZURE_AD_CLIENT_SECRET",
  "AZURE_AD_TENANT_ID",
] as const

let snap: Record<string, string | undefined> = {}

beforeEach(() => {
  snap = {}
  for (const k of KEYS) {
    snap[k] = process.env[k]
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of KEYS) {
    if (snap[k] === undefined) delete process.env[k]
    else (process.env as Record<string, string>)[k] = snap[k] as string
  }
})

describe("auth-providers", () => {
  it("liefert leere Liste, wenn keine Env gesetzt", () => {
    expect(listConfiguredOAuthProviders()).toEqual([])
    expect(buildOAuthProviders()).toHaveLength(0)
  })

  it("blendet Provider nur ein, wenn beide Werte gesetzt sind", () => {
    process.env.GOOGLE_CLIENT_ID = "abc"
    // SECRET fehlt absichtlich
    expect(listConfiguredOAuthProviders()).toEqual([])
    process.env.GOOGLE_CLIENT_SECRET = "xyz"
    expect(listConfiguredOAuthProviders().map((p) => p.id)).toContain("google")
  })

  it("zeigt alle vier Provider, wenn alle Envs gesetzt sind", () => {
    process.env.GOOGLE_CLIENT_ID = "1"
    process.env.GOOGLE_CLIENT_SECRET = "1"
    process.env.APPLE_CLIENT_ID = "1"
    process.env.APPLE_CLIENT_SECRET = "1"
    process.env.FACEBOOK_CLIENT_ID = "1"
    process.env.FACEBOOK_CLIENT_SECRET = "1"
    process.env.AZURE_AD_CLIENT_ID = "1"
    process.env.AZURE_AD_CLIENT_SECRET = "1"

    const ids = listConfiguredOAuthProviders().map((p) => p.id)
    expect(ids).toEqual(["google", "apple", "facebook", "azure-ad"])
    expect(buildOAuthProviders()).toHaveLength(4)
  })

  it("Labels sind deutsch und produktnah", () => {
    process.env.APPLE_CLIENT_ID = "1"
    process.env.APPLE_CLIENT_SECRET = "1"
    const [apple] = listConfiguredOAuthProviders()
    expect(apple.label).toMatch(/Apple/)
    expect(apple.label).toMatch(/fortfahren/i)
  })
})
