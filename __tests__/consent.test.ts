import { describe, it, expect } from "vitest"
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  acceptAll,
  consentModeBootstrapScript,
  customConsent,
  denyAll,
  parseConsent,
  toConsentModeSignals,
} from "../lib/consent"

describe("Consent-Defaults (§ 25 Abs. 1 TDDDG)", () => {
  it("verweigert per Default alles Einwilligungspflichtige", () => {
    const s = denyAll()
    expect(s.necessary).toBe(true)
    expect(s.analytics).toBe(false)
    expect(s.marketing).toBe(false)
  })

  it("acceptAll erteilt beide einwilligungspflichtigen Kategorien", () => {
    const s = acceptAll()
    expect(s.analytics).toBe(true)
    expect(s.marketing).toBe(true)
  })

  it("customConsent übernimmt genau die getroffene Auswahl", () => {
    const s = customConsent({ analytics: true, marketing: false })
    expect(s.analytics).toBe(true)
    expect(s.marketing).toBe(false)
    // Technisch notwendig ist niemals abwählbar.
    expect(s.necessary).toBe(true)
  })

  it("stempelt jede Entscheidung mit Version und Zeitpunkt (Art. 7 Abs. 1 DSGVO)", () => {
    const s = acceptAll()
    expect(s.version).toBe(CONSENT_VERSION)
    expect(Number.isNaN(Date.parse(s.decidedAt))).toBe(false)
  })
})

describe("parseConsent", () => {
  it("liefert null bei fehlendem oder kaputtem Wert", () => {
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
    expect(parseConsent("")).toBeNull()
    expect(parseConsent("kein-json")).toBeNull()
  })

  it("liest eine gültige Einwilligung korrekt zurück", () => {
    const raw = encodeURIComponent(
      JSON.stringify({
        analytics: true,
        marketing: false,
        version: CONSENT_VERSION,
        decidedAt: "2026-08-20T10:00:00.000Z",
      })
    )
    const s = parseConsent(raw)
    expect(s).not.toBeNull()
    expect(s?.analytics).toBe(true)
    expect(s?.marketing).toBe(false)
  })

  it("verwirft eine Einwilligung mit veralteter Version (erneute Abfrage)", () => {
    const raw = encodeURIComponent(
      JSON.stringify({ analytics: true, marketing: true, version: CONSENT_VERSION - 1 })
    )
    expect(parseConsent(raw)).toBeNull()
  })

  it("interpretiert fehlende Felder als Ablehnung (fail-closed)", () => {
    const raw = encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION }))
    const s = parseConsent(raw)
    expect(s?.analytics).toBe(false)
    expect(s?.marketing).toBe(false)
  })

  it("wertet nur echtes true als Einwilligung (kein truthy-Cast)", () => {
    const raw = encodeURIComponent(
      JSON.stringify({ analytics: "ja", marketing: 1, version: CONSENT_VERSION })
    )
    const s = parseConsent(raw)
    expect(s?.analytics).toBe(false)
    expect(s?.marketing).toBe(false)
  })
})

describe("Google Consent Mode v2 – Signale", () => {
  it("verweigert ohne Einwilligung alle vier v2-Signale", () => {
    const sig = toConsentModeSignals(null)
    expect(sig.ad_storage).toBe("denied")
    expect(sig.ad_user_data).toBe("denied")
    expect(sig.ad_personalization).toBe("denied")
    expect(sig.analytics_storage).toBe("denied")
    // security_storage ist technisch notwendig und stets erlaubt.
    expect(sig.security_storage).toBe("granted")
  })

  it("erteilt analytics_storage nur bei Statistik-Einwilligung", () => {
    const sig = toConsentModeSignals(customConsent({ analytics: true, marketing: false }))
    expect(sig.analytics_storage).toBe("granted")
    expect(sig.ad_storage).toBe("denied")
    expect(sig.ad_user_data).toBe("denied")
    expect(sig.ad_personalization).toBe("denied")
  })

  it("erteilt die Werbe-Signale nur bei Marketing-Einwilligung", () => {
    const sig = toConsentModeSignals(customConsent({ analytics: false, marketing: true }))
    expect(sig.ad_storage).toBe("granted")
    expect(sig.ad_user_data).toBe("granted")
    expect(sig.ad_personalization).toBe("granted")
    expect(sig.analytics_storage).toBe("denied")
  })
})

describe("consentModeBootstrapScript", () => {
  const script = consentModeBootstrapScript()

  it("setzt alle vier v2-Signale per Default auf denied", () => {
    expect(script).toMatch(/ad_storage:\s*'denied'/)
    expect(script).toMatch(/ad_user_data:\s*'denied'/)
    expect(script).toMatch(/ad_personalization:\s*'denied'/)
    expect(script).toMatch(/analytics_storage:\s*'denied'/)
  })

  it("referenziert den korrekten Cookie-Namen und die aktuelle Version", () => {
    expect(script).toContain(CONSENT_COOKIE)
    expect(script).toContain(String(CONSENT_VERSION))
  })

  it("nutzt gtag('consent', 'default', …) vor jedem Update", () => {
    const defaultIdx = script.indexOf("'default'")
    const updateIdx = script.indexOf("'update'")
    expect(defaultIdx).toBeGreaterThan(-1)
    expect(updateIdx).toBeGreaterThan(defaultIdx)
  })
})
