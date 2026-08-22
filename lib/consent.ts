/**
 * Cookie-Consent gemäß § 25 TDDDG und Art. 6 Abs. 1 lit. a DSGVO.
 *
 * Rechtliche Eckpunkte, die dieser Code technisch durchsetzt:
 *  - Einwilligungsbedürftige Technologien (Analyse, Werbung) werden erst NACH
 *    aktiver Einwilligung geladen (§ 25 Abs. 1 TDDDG).
 *  - "Ablehnen" ist gleichwertig zu "Akzeptieren" (gleiche Ebene, gleiche
 *    Klickzahl) — sonst ist die Einwilligung nicht freiwillig (Art. 4 Nr. 11,
 *    Art. 7 DSGVO; EDSA-Leitlinien 03/2022 zu Deceptive Design).
 *  - Die Einwilligung ist jederzeit mit Wirkung für die Zukunft widerrufbar
 *    (Art. 7 Abs. 3 DSGVO) — über den Footer-Link "Cookie-Einstellungen".
 *  - Technisch notwendige Cookies sind einwilligungsfrei
 *    (§ 25 Abs. 2 Nr. 2 TDDDG) und daher nicht abwählbar.
 *  - Der Einwilligungsstatus wird versioniert gespeichert, damit bei einer
 *    Erweiterung der Zwecke erneut gefragt wird (Nachweispflicht Art. 7 Abs. 1).
 *
 * Diese Datei ist bewusst frei von Server-Imports (läuft im Client-Bundle).
 */

export const CONSENT_COOKIE = "ur_consent"

/**
 * Version der Einwilligung. Bei inhaltlicher Erweiterung der Zwecke erhöhen —
 * gespeicherte Einwilligungen älterer Versionen werden dann ungültig und der
 * Banner erscheint erneut.
 */
export const CONSENT_VERSION = 1

/** Speicherdauer der Einwilligungsentscheidung: 6 Monate (DSK-Empfehlung). */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182

export type ConsentCategory = "necessary" | "analytics" | "marketing"

export type ConsentState = {
  /** Technisch notwendig — immer true, nicht abwählbar. */
  necessary: true
  /** Google Analytics 4. */
  analytics: boolean
  /** Google Ads / Conversion-Tracking. */
  marketing: boolean
  /** Version, unter der die Einwilligung erteilt wurde. */
  version: number
  /** Zeitpunkt der Entscheidung (ISO) — Nachweis nach Art. 7 Abs. 1 DSGVO. */
  decidedAt: string
}

/** Alles abgelehnt außer technisch notwendig. Der sichere Default. */
export function denyAll(): ConsentState {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  }
}

export function acceptAll(): ConsentState {
  return {
    necessary: true,
    analytics: true,
    marketing: true,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  }
}

export function customConsent(opts: {
  analytics: boolean
  marketing: boolean
}): ConsentState {
  return {
    necessary: true,
    analytics: !!opts.analytics,
    marketing: !!opts.marketing,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  }
}

/** Parst einen gespeicherten Consent-String; null bei ungültig/veraltet. */
export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (typeof d.version !== "number" || d.version !== CONSENT_VERSION) {
    // Veraltete Einwilligung → erneut fragen.
    return null
  }
  return {
    necessary: true,
    analytics: d.analytics === true,
    marketing: d.marketing === true,
    version: CONSENT_VERSION,
    decidedAt: typeof d.decidedAt === "string" ? d.decidedAt : new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Client-seitiges Cookie-Handling
// ---------------------------------------------------------------------------

export function readConsentCookie(): ConsentState | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${CONSENT_COOKIE}=`))
  if (!match) return null
  return parseConsent(match.slice(CONSENT_COOKIE.length + 1))
}

export function writeConsentCookie(state: ConsentState): void {
  if (typeof document === "undefined") return
  const value = encodeURIComponent(JSON.stringify(state))
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  // Kein HttpOnly: das Client-Skript muss den Status vor dem Laden von
  // GA/Ads auswerten können.
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

// ---------------------------------------------------------------------------
// Google Consent Mode v2
// ---------------------------------------------------------------------------

/**
 * Consent-Mode-v2-Signale. Seit März 2024 verlangt Google diese Signale, damit
 * Anzeigen-/Messdaten im EWR überhaupt verarbeitet werden dürfen.
 */
export type ConsentModeSignals = {
  ad_storage: "granted" | "denied"
  ad_user_data: "granted" | "denied"
  ad_personalization: "granted" | "denied"
  analytics_storage: "granted" | "denied"
  functionality_storage: "granted" | "denied"
  personalization_storage: "granted" | "denied"
  security_storage: "granted" | "denied"
}

export function toConsentModeSignals(state: ConsentState | null): ConsentModeSignals {
  const analytics = state?.analytics === true
  const marketing = state?.marketing === true
  return {
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
    analytics_storage: analytics ? "granted" : "denied",
    // Funktionale/Personalisierungs-Speicher nutzen wir nicht gesondert;
    // security_storage ist stets erlaubt (technisch notwendig).
    functionality_storage: "granted",
    personalization_storage: "denied",
    security_storage: "granted",
  }
}

/**
 * Inline-Skript, das VOR jedem Google-Tag laufen muss: setzt alle
 * einwilligungspflichtigen Signale auf "denied" und wendet danach eine bereits
 * gespeicherte Einwilligung an. So wird ohne Einwilligung nichts gesetzt.
 */
export function consentModeBootstrapScript(): string {
  return `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = window.gtag || gtag;
  // 1) Default: alles Einwilligungspflichtige verweigert (§ 25 Abs. 1 TDDDG).
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500
  });
  // 2) Gespeicherte Einwilligung anwenden (falls vorhanden und aktuell).
  try {
    var m = document.cookie.split(';').map(function(p){return p.trim();})
      .filter(function(p){return p.indexOf('${CONSENT_COOKIE}=') === 0;})[0];
    if (m) {
      var s = JSON.parse(decodeURIComponent(m.substring(${CONSENT_COOKIE.length + 1})));
      if (s && s.version === ${CONSENT_VERSION}) {
        gtag('consent', 'update', {
          ad_storage: s.marketing ? 'granted' : 'denied',
          ad_user_data: s.marketing ? 'granted' : 'denied',
          ad_personalization: s.marketing ? 'granted' : 'denied',
          analytics_storage: s.analytics ? 'granted' : 'denied'
        });
      }
    }
  } catch (e) {}
})();`.trim()
}

/** Event-Name, über den Komponenten auf Consent-Änderungen reagieren. */
export const CONSENT_CHANGED_EVENT = "fragenkreuzen:consent-changed"

/** Event-Name, mit dem der Footer-Link die Einstellungen erneut öffnet. */
export const CONSENT_OPEN_EVENT = "fragenkreuzen:consent-open"
