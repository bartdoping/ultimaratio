"use client"

import Script from "next/script"
import { useEffect, useState } from "react"
import {
  readConsentCookie,
  CONSENT_CHANGED_EVENT,
  type ConsentState,
} from "@/lib/consent"

/**
 * Lädt Google Analytics 4 und Google Ads AUSSCHLIESSLICH nach aktiver
 * Einwilligung ("Basic Consent Mode").
 *
 * Warum Basic statt Advanced Consent Mode: Im Advanced Mode würde gtag.js
 * bereits ohne Einwilligung geladen und sendet cookielose Pings an Google.
 * Deutsche Aufsichtsbehörden bewerten schon das Laden des Skripts und den
 * damit verbundenen Verbindungsaufbau kritisch (§ 25 Abs. 1 TDDDG,
 * Übermittlung der IP-Adresse). Wir laden das Tag daher erst, wenn eine
 * Einwilligung für Statistik oder Marketing vorliegt.
 *
 * Ohne gesetzte Umgebungsvariablen passiert gar nichts — die Komponente ist
 * damit sicher deploybar, bevor GA/Ads überhaupt eingerichtet sind.
 */
export function GoogleTags() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim()

  const [consent, setConsent] = useState<ConsentState | null>(null)

  useEffect(() => {
    setConsent(readConsentCookie())
    function onChange(e: Event) {
      const detail = (e as CustomEvent<ConsentState>).detail
      setConsent(detail ?? readConsentCookie())
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
  }, [])

  // Nichts konfiguriert → nichts laden.
  if (!gaId && !adsId) return null

  const analyticsAllowed = consent?.analytics === true
  const marketingAllowed = consent?.marketing === true
  if (!analyticsAllowed && !marketingAllowed) return null

  // Das Tag wird über die erste verfügbare, eingewilligte ID geladen.
  const primaryId = analyticsAllowed && gaId ? gaId : adsId
  if (!primaryId) return null

  const configLines: string[] = []
  if (analyticsAllowed && gaId) {
    // anonymize_ip ist bei GA4 Standard; explizit gesetzt schadet nicht.
    configLines.push(`gtag('config', '${gaId}', { anonymize_ip: true });`)
  }
  if (marketingAllowed && adsId) {
    configLines.push(`gtag('config', '${adsId}');`)
  }

  return (
    <>
      <Script
        id="google-tag-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag-config" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('consent', 'update', {
  ad_storage: '${marketingAllowed ? "granted" : "denied"}',
  ad_user_data: '${marketingAllowed ? "granted" : "denied"}',
  ad_personalization: '${marketingAllowed ? "granted" : "denied"}',
  analytics_storage: '${analyticsAllowed ? "granted" : "denied"}'
});
${configLines.join("\n")}
        `.trim()}
      </Script>
    </>
  )
}
