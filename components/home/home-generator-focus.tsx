import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buildLoginHref, buildRegisterHref } from "@/lib/auth-redirect"
import { PriceNote } from "@/components/legal/price-note"
import { POOL_LIMIT_ANON, POOL_LIMIT_FREE, GENERATOR_FREE_DAILY_LIMIT, GENERATOR_PRO_DAILY_LIMIT } from "@/lib/generator-plan-config"
import {
  ArrowRight,
  Check,
  Layers,
  Microscope,
  Repeat,
  Sparkles,
  Target,
  WifiOff,
  Zap,
} from "lucide-react"

type Props = {
  loggedIn: boolean
}

const BENEFITS = [
  {
    icon: Zap,
    title: "Endlos kreuzen, ohne Warten",
    text: "Thema eintippen, los. Die nächste Frage liegt immer schon bereit — Frage um Frage, so lange du willst.",
  },
  {
    icon: Sparkles,
    title: "Der Aha-Moment statt Lehrbuch",
    text: "Falsch gekreuzt? Du siehst zuerst, warum genau deine Wahl nicht passt. Dann ein Satz, der hängen bleibt.",
  },
  {
    icon: Repeat,
    title: "Deine Fehler kommen wieder",
    text: "Was du falsch hattest, taucht automatisch zum richtigen Zeitpunkt erneut auf — bis es sitzt.",
  },
  {
    icon: Microscope,
    title: "Wirklich schwer, wenn du willst",
    text: "Stufe 1 bis 5 — oben mit den Fallstricken, die im Examen Punkte kosten.",
  },
  {
    icon: WifiOff,
    title: "Gemacht fürs Handy",
    text: "Eine Hand, ein Daumen, auch im Funkloch: Dein Fragenvorrat liegt auf dem Gerät.",
  },
  {
    icon: Layers,
    title: "Eigene Fallvignetten",
    text: "Für die Lerngruppe oder das Repetitorium: Fälle mit 2–5 Teilfragen auf Knopfdruck.",
  },
] as const

const COMPARISON: Array<{
  label: string
  free: string
  pro: string
  highlight?: boolean
}> = [
  { label: "Fragen kreuzen pro Tag", free: String(POOL_LIMIT_FREE), pro: "So viel du willst*", highlight: true },
  { label: "Eigene Generierungen pro Tag", free: String(GENERATOR_FREE_DAILY_LIMIT), pro: String(GENERATOR_PRO_DAILY_LIMIT) },
  { label: "Aha-Erklärung & Vertiefung", free: "Verfügbar", pro: "Verfügbar" },
  { label: "Automatische Wiederholung", free: "Verfügbar", pro: "Verfügbar" },
  { label: "Schwierigkeit 1–5", free: "Verfügbar", pro: "Verfügbar" },
]

export function HomeGeneratorFocus({ loggedIn }: Props) {
  return (
    <main className="relative space-y-16 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-primary/5 via-background to-muted/30">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-30 bg-primary/30 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20 text-center space-y-6">
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="mr-1 h-3 w-3" />
            Prüfungsfragen fürs Medizinstudium
          </Badge>
          {/*
            Typografische Signatur von ultima-rat.io: ein kursives Akzentwort
            im Marken-Petrol innerhalb der ansonsten dunklen Überschrift.
          */}
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Frage um Frage. <br className="hidden sm:inline" />
            <span className="accent-word">Bis es sitzt.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
            Thema eintippen und kreuzen — ohne Wartezeit, mit einem Aha-Satz zu jeder Antwort.
            Deine Fehler kommen automatisch wieder. Im Bus, in der Pause, vor der Prüfung.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/kreuzen">
                Jetzt kreuzen — ohne Anmeldung
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            {!loggedIn && (
              <Button asChild size="lg" variant="ghost">
                <Link href={buildLoginHref("/kreuzen")}>Anmelden</Link>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {POOL_LIMIT_ANON} Fragen sofort ohne Konto · {POOL_LIMIT_FREE} pro Tag mit kostenlosem Konto · Pro: so viel du willst
          </p>
        </div>
      </section>

      {/* Live-Beispiel einer generierten Frage */}
      <section className="mx-auto max-w-3xl px-2">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">So sieht eine Frage aus</h2>
          <Badge variant="outline" className="text-xs uppercase tracking-wide">
            Beispiel
          </Badge>
        </div>
        <DemoQuestionCard />
      </section>

      {/* Vorteile */}
      <section className="mx-auto max-w-5xl px-2 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Warum man nicht mehr aufhört</h2>
          <p className="text-sm text-muted-foreground">
            Wenige Funktionen — die aber richtig.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl border bg-card p-5 space-y-2 transition-colors hover:bg-muted/30">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-4 w-4" />
              </span>
              <p className="font-medium leading-snug">{b.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs Pro */}
      <section className="mx-auto max-w-3xl px-2 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Free oder Pro?</h2>
          <p className="text-sm text-muted-foreground">
            Alles ist in beiden Tarifen drin. Pro entfernt nur das tägliche Limit.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">&nbsp;</th>
                <th className="px-5 py-3 font-medium">Free</th>
                <th className="px-5 py-3 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    Pro
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                      9,99&nbsp;€/Mo
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {COMPARISON.map((row) => (
                <tr key={row.label} className={row.highlight ? "bg-primary/5" : undefined}>
                  <td className="px-5 py-3 font-medium">{row.label}</td>
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">{row.free}</td>
                  <td className="px-5 py-3 font-medium tabular-nums">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col gap-2 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Pro: 9,99 € pro Monat · monatlich kündbar · Pro bleibt bis
                Periodenende aktiv
              </p>
              {/* Pflichtangabe nach § 3 PAngV */}
              <PriceNote />
              <p className="text-xs text-muted-foreground">
                * im Rahmen der Fair-Use-Grenzen nach § 2 der{" "}
                <Link href="/agb" className="underline underline-offset-2">
                  AGB
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/kreuzen">Erst mal testen</Link>
              </Button>
              {!loggedIn ? (
                <Button asChild size="sm">
                  <Link href={buildRegisterHref("/kreuzen")}>Kostenlos starten</Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/subscription">Pro freischalten</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* So funktioniert es */}
      <section className="mx-auto max-w-4xl px-2 space-y-5">
        <h2 className="text-center text-xl font-semibold tracking-tight">So funktioniert es</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[
            {
              step: "1",
              title: "Thema eintippen",
              text: "Oder Prüfungsdatum setzen — dann kommt jeden Tag das passende Thema.",
            },
            {
              step: "2",
              title: "Kreuzen",
              text: "Antippen, prüfen, Aha lesen, weiter. Die nächste Frage ist schon da.",
            },
            {
              step: "3",
              title: "Wiederholen",
              text: "Deine Fehler kommen von selbst wieder, bis sie sitzen. Mit Streak und Tagesziel.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border bg-card p-5 space-y-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {item.step}
              </span>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="text-center pt-2">
          <Button asChild size="lg">
            <Link href="/kreuzen">
              Jetzt kreuzen
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

function DemoQuestionCard() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-5 py-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="rounded-full border bg-background px-2 py-0.5 font-medium">Einzelfrage</span>
          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
            5/5 · Sehr schwer
          </span>
        </div>
        <span className="font-medium text-muted-foreground">Thema: Akutes Koronarsyndrom</span>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <p className="text-base leading-relaxed">
          Ein 62-jähriger Patient mit bekannter pAVK stellt sich mit retrosternalem Druckgefühl seit 40 Minuten
          vor. EKG zeigt ST-Senkungen in V4–V6 ohne ST-Hebungen. Troponin T (hs) ist initial leicht erhöht,
          steigt im Verlauf an. Welche Maßnahme ist <strong>als nächste</strong> indiziert?
        </p>

        <div className="space-y-2">
          {[
            { letter: "A", text: "Sofortige Lyse-Therapie mit Tenecteplase.", muted: true },
            {
              letter: "B",
              text: "Frühinvasive Strategie mit Koronarangiographie innerhalb von 24 Stunden.",
              correct: true,
            },
            { letter: "C", text: "Konservative Therapie, Wiedervorstellung in 48 Stunden.", muted: true },
            { letter: "D", text: "Direkte Kardio-MRT zur Diagnosesicherung.", muted: true },
            { letter: "E", text: "Reine ASS-Monotherapie ohne weitere Diagnostik.", muted: true },
          ].map((opt) => (
            <div
              key={opt.letter}
              className={
                opt.correct
                  ? "flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5"
                  : "flex items-start gap-3 rounded-lg border bg-background px-3 py-2.5"
              }
            >
              <span
                className={
                  opt.correct
                    ? "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                    : "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                }
              >
                {opt.letter}
              </span>
              <span className={opt.muted ? "text-sm text-muted-foreground" : "text-sm"}>{opt.text}</span>
              {opt.correct && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Richtig
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Target className="h-3.5 w-3.5" /> Must-Know
            </div>
            <p>Beim NSTE-ACS bestimmt die GRACE-/TIMI-Risikostratifizierung das Zeitfenster für die invasive Diagnostik – die frühinvasive Strategie ist bei intermediärem bis hohem Risiko leitliniengerecht.</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> Lernhilfe
            </div>
            <p>MONA-B beim akuten Koronarsyndrom: Morphin, Sauerstoff (nur bei SpO₂ &lt; 90 %), Nitrate, ASS, Betablocker.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
