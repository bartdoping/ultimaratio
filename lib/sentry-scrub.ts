import type { ErrorEvent } from "@sentry/nextjs"

/**
 * Datensparsamkeit für Fehlerberichte: Sentry soll sehen, WAS kaputt ist —
 * nicht, WER gerade da war. Ohne Nutzerbezug, Cookies, Header und
 * Anfrage-Inhalte; Query-Strings (Abmelde-Tokens) und E-Mail-Adressen fliegen raus.
 */

const EMAIL = /[^\s"'<>(),;:]+@[^\s"'<>(),;:]+\.[a-zA-Z]{2,}/g

export function ohneEmail(text: string): string {
  return text.replace(EMAIL, "[E-Mail]")
}

export function ohneQuery(url: string): string {
  return url.split(/[?#]/)[0]
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user
  delete event.extra
  delete event.server_name
  delete event.breadcrumbs

  if (event.request) {
    delete event.request.cookies
    delete event.request.headers
    delete event.request.data
    delete event.request.query_string
    if (event.request.url) event.request.url = ohneQuery(event.request.url)
  }

  if (event.message) event.message = ohneEmail(event.message)
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = ohneEmail(ex.value)
  }
  return event
}

/** Gemeinsame Einstellungen für Browser, Server und Edge. Ohne DSN bleibt Sentry aus. */
export const SENTRY_BASIS = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "development",
  sendDefaultPii: false,
  // Nur Fehler, kein Performance-Tracing und keine Sitzungsaufzeichnung.
  tracesSampleRate: 0,
  maxBreadcrumbs: 0,
  // Funklöcher und Browser-Erweiterungen sind keine Produktfehler.
  ignoreErrors: ["ResizeObserver loop", "Failed to fetch", "Load failed", "NetworkError", "ChunkLoadError"],
  beforeSend: scrubEvent,
}
