import Link from "next/link"
import type { Metadata } from "next"
import { Compass, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "Seite nicht gefunden | fragenkreuzen.de",
  description:
    "Diese Seite gibt es leider nicht (mehr). Spring direkt zum KI-Generator oder zur Startseite.",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">
        Seite nicht gefunden
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Die angefragte Seite existiert nicht (mehr). Vielleicht passt eines der folgenden Ziele.
      </p>

      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        <Link
          href="/generator"
          className="rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Zum Generator
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Direkt loslegen: Thema eingeben, Frage generieren, kreuzen.
          </p>
        </Link>
        <Link
          href="/probieren"
          className="rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
        >
          <div className="text-sm font-medium">Demo ohne Konto</div>
          <p className="mt-1 text-xs text-muted-foreground">
            3 KI-Generierungen am Tag, keine Registrierung nötig.
          </p>
        </Link>
        <Link
          href="/pricing"
          className="rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
        >
          <div className="text-sm font-medium">Preise &amp; Pro</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Free vs Pro, Wettbewerbsvergleich, 7-Tage-Testphase.
          </p>
        </Link>
        <Link
          href="/blog"
          className="rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
        >
          <div className="text-sm font-medium">Blog</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Tipps und Updates rund um KI-Kreuzen.
          </p>
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Falls du glaubst, dass das ein Fehler ist:{" "}
        <Link href="/" className="underline-offset-2 hover:underline">
          zur Startseite
        </Link>
        .
      </p>
    </main>
  )
}
