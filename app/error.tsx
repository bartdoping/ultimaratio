"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"

/**
 * Global Error-Boundary für routes innerhalb des Root-Layouts.
 *
 * Zeigt eine freundliche Fehlerseite statt eines White-Screens und bietet
 * dem User eine konkrete Erholungs-Aktion an.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Konsolen-Log für Telemetrie. In Production via Sentry-ähnlichem Tool ersetzbar.
    if (typeof window !== "undefined") {
      // Best-effort: an ein potenzielles Server-Endpoint melden.
      try {
        void fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            category: "bug",
            message: `[client-error] ${error.message}${error.digest ? ` (digest: ${error.digest})` : ""}`,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            silent: true,
          }),
          keepalive: true,
        })
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line no-console
    console.error("Global error boundary caught:", error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        Da ist etwas schiefgelaufen.
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Wir haben den Fehler automatisch protokolliert. Du kannst die Seite neu laden, zurück zur
        Startseite gehen oder direkt zum Generator.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-muted-foreground">
          Fehler-ID: <code className="rounded bg-muted/40 px-1.5 py-0.5">{error.digest}</code>
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => reset()} variant="default">
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Erneut versuchen
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Zur Startseite
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/generator">Zum Generator</Link>
        </Button>
      </div>
    </main>
  )
}
