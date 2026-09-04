"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Cookie, ShieldCheck, BarChart3, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  acceptAll,
  customConsent,
  denyAll,
  readConsentCookie,
  writeConsentCookie,
  toConsentModeSignals,
  CONSENT_CHANGED_EVENT,
  CONSENT_OPEN_EVENT,
  type ConsentState,
} from "@/lib/consent"

type GtagFn = (...args: unknown[]) => void

function pushConsentToGoogle(state: ConsentState) {
  if (typeof window === "undefined") return
  const w = window as unknown as { gtag?: GtagFn; dataLayer?: unknown[] }
  const signals = toConsentModeSignals(state)
  if (typeof w.gtag === "function") {
    w.gtag("consent", "update", {
      ad_storage: signals.ad_storage,
      ad_user_data: signals.ad_user_data,
      ad_personalization: signals.ad_personalization,
      analytics_storage: signals.analytics_storage,
    })
  }
}

/**
 * Einwilligungsbanner (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO).
 *
 * Gestaltungsvorgaben, die hier bewusst umgesetzt sind:
 *  - "Alle ablehnen" steht gleichrangig neben "Alle akzeptieren": gleiche
 *    Ebene, gleiche Größe, gleiche Klickzahl. Kein Dark Pattern.
 *  - Ohne Entscheidung wird nichts Einwilligungspflichtiges geladen.
 *  - Der Banner blockiert die Seite nicht (kein Cookie-Wall).
 *  - Über den Footer-Link "Cookie-Einstellungen" jederzeit erneut aufrufbar.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Erst nach Mount entscheiden, ob der Banner nötig ist (kein SSR-Flash).
  useEffect(() => {
    setMounted(true)
    const existing = readConsentCookie()
    if (!existing) {
      setOpen(true)
    } else {
      setAnalytics(existing.analytics)
      setMarketing(existing.marketing)
    }
  }, [])

  // Footer-Link "Cookie-Einstellungen" öffnet den Banner erneut (Widerruf).
  useEffect(() => {
    function onOpen() {
      const existing = readConsentCookie()
      setAnalytics(existing?.analytics ?? false)
      setMarketing(existing?.marketing ?? false)
      setShowDetails(true)
      setOpen(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  const persist = useCallback((state: ConsentState) => {
    writeConsentCookie(state)
    pushConsentToGoogle(state)
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: state }))
    setOpen(false)
    setShowDetails(false)
  }, [])

  if (!mounted || !open) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background/98 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}
    >
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:inline-flex"
            aria-hidden="true"
          >
            <Cookie className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="consent-title" className="text-sm font-semibold sm:text-base">
              Datenschutz-Einstellungen
            </h2>
            <p id="consent-desc" className="mt-1 text-sm text-muted-foreground">
              Wir verwenden technisch notwendige Cookies, damit die Plattform
              funktioniert. Zusätzlich möchten wir – nur mit deiner Einwilligung –
              Statistik- und Marketing-Dienste einsetzen, um unser Angebot zu
              verbessern. Du kannst deine Auswahl jederzeit im Footer unter
              „Cookie-Einstellungen" ändern. Mehr dazu in unserer{" "}
              <Link href="/datenschutz" className="underline underline-offset-2">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-2">
            <CategoryRow
              icon={ShieldCheck}
              title="Technisch notwendig"
              description="Login-Sitzung, Sicherheitsfunktionen (CSRF), Missbrauchsschutz und Speicherung deiner Cookie-Auswahl. Ohne diese Cookies funktioniert die Plattform nicht."
              checked
              disabled
              onChange={() => {}}
              badge="Immer aktiv"
            />
            <CategoryRow
              icon={BarChart3}
              title="Statistik (Google Analytics)"
              description="Hilft uns zu verstehen, wie die Plattform genutzt wird – z. B. welche Seiten aufgerufen werden. Die IP-Adresse wird dabei gekürzt."
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              icon={Megaphone}
              title="Marketing (Google Ads)"
              description="Ermöglicht uns zu messen, ob eine Anzeige zu einer Registrierung geführt hat (Conversion-Tracking)."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        {/* Aktionen: "Ablehnen" und "Akzeptieren" bewusst gleichrangig. */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row">
            <button
              type="button"
              onClick={() => persist(denyAll())}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Alle ablehnen
            </button>
            <button
              type="button"
              onClick={() => persist(acceptAll())}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Alle akzeptieren
            </button>
          </div>
          {showDetails ? (
            <button
              type="button"
              onClick={() => persist(customConsent({ analytics, marketing }))}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
            >
              Auswahl speichern
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              aria-expanded={showDetails}
            >
              Einstellungen
            </button>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Rechtsgrundlage für einwilligungspflichtige Dienste ist deine Einwilligung
          (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Der Widerruf ist jederzeit
          mit Wirkung für die Zukunft möglich.{" "}
          <Link href="/impressum" className="underline underline-offset-2">
            Impressum
          </Link>
        </p>
      </div>
    </div>
  )
}

function CategoryRow({
  icon: Icon,
  title,
  description,
  checked,
  disabled = false,
  onChange,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  badge?: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-card/50 p-3 transition-colors",
        disabled ? "cursor-default opacity-90" : "hover:bg-muted/40"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}

/**
 * Footer-Link, der das Banner erneut öffnet (Art. 7 Abs. 3 DSGVO – Widerruf
 * muss so einfach sein wie die Erteilung).
 */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))}
      className={className}
    >
      Cookie-Einstellungen
    </button>
  )
}
