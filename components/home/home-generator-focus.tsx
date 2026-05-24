import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UpcomingFeaturesGrid } from "@/components/platform/upcoming-features-grid"
import { buildLoginHref, buildRegisterHref } from "@/lib/auth-redirect"

type Props = {
  loggedIn: boolean
}

export function HomeGeneratorFocus({ loggedIn }: Props) {
  return (
    <main className="relative space-y-14 pb-10">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-primary/5 via-background to-muted/40">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30 bg-primary/30 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-14 md:py-16 text-center space-y-6">
          <Badge variant="secondary" className="text-xs">
            Jetzt verfügbar · KI-Fragen-Generator
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Prüfungsfragen generieren. Direkt kreuzen.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Erstelle anspruchsvolle Single-Choice- und Fallfragen mit Erklärungen – sofort spielbar,
            ohne Speicherung. Der Generator ist dein Einstieg in fragenkreuzen.de.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/generator">Zum Generator</Link>
            </Button>
            {!loggedIn && (
              <>
                <Button asChild size="lg" variant="outline">
                  <Link href={buildRegisterHref("/generator")}>Kostenlos registrieren</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href={buildLoginHref("/generator")}>Anmelden</Link>
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            3 Generierungen pro Tag kostenlos · Mit Pro bis zu 100 pro Tag
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-2 space-y-4">
        <h2 className="text-center text-xl font-semibold">So funktioniert der Generator</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[
            { step: "1", title: "Thema wählen", text: "Einzelfrage oder Fall mit 2–5 Teilfragen, Schwierigkeit 1–5." },
            { step: "2", title: "Generieren", text: "KI erstellt Stem, Optionen und vollständige Erklärungen." },
            { step: "3", title: "Kreuzen", text: "Sofort üben – mit Labor-Dialog und Gesamterklärung." },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border bg-card p-5 space-y-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
                {item.step}
              </span>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="bald-verfuegbar" className="mx-auto max-w-5xl px-2 space-y-6 scroll-mt-20">
        <div className="text-center space-y-2">
          <Badge variant="outline">Coming Soon</Badge>
          <h2 className="text-2xl font-semibold">Die komplette Lernplattform folgt</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Wir bauen fragenkreuzen.de Schritt für Schritt aus. Diese Bereiche sind in Arbeit –
            du kannst sie schon jetzt entdecken, was dich erwartet.
          </p>
        </div>
        <UpcomingFeaturesGrid />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link href="/coming-soon">Alle geplanten Features ansehen</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
