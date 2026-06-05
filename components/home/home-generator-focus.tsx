import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buildLoginHref, buildRegisterHref } from "@/lib/auth-redirect"
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Layers,
  Microscope,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"

type Props = {
  loggedIn: boolean
}

const BENEFITS = [
  {
    icon: BookOpenCheck,
    title: "Examensnahe Single-Choice-Fragen",
    text: "Stem, 5 Antwortoptionen A–E und Einzelerklärungen pro Option – wie im echten Staatsexamen.",
  },
  {
    icon: Layers,
    title: "Fallvignetten mit 2–5 Teilfragen",
    text: "Klinische Fälle mit progressiver Informationsstruktur und spoiler-freier Auswertung.",
  },
  {
    icon: Target,
    title: "Must-Know & Lernhilfe je Frage",
    text: "Nach jeder Bestätigung: das eine Kerndetail zum Hängenbleiben. Plus echte Eselsbrücken — aber nur, wenn sie wirklich tragen.",
  },
  {
    icon: Microscope,
    title: "Schwierigkeitsstufen 1–5",
    text: "Von Basiswissen bis differenzialdiagnostisch eng – wirklich schwer auf Stufe 4 und 5.",
  },
  {
    icon: Zap,
    title: "Direkt kreuzbar, ohne Setup",
    text: "Keine Decks, kein Tracking, kein Speicher-Aufwand. Thema eingeben, lernen, fertig.",
  },
] as const

const COMPARISON: Array<{
  label: string
  free: string
  pro: string
  highlight?: boolean
}> = [
  { label: "Generierungen pro Tag", free: "3", pro: "100", highlight: true },
  { label: "Fallvignetten mit 2–5 Teilfragen", free: "Im Limit enthalten", pro: "Ohne Limit-Druck" },
  { label: "Schwierigkeit 1–5", free: "Verfügbar", pro: "Verfügbar" },
  { label: "Erklärungen pro Antwort", free: "Verfügbar", pro: "Verfügbar" },
  { label: "Must-Know & Lernhilfe (wenn hilfreich)", free: "Verfügbar", pro: "Verfügbar" },
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
            KI-Generator für medizinische Prüfungsfragen
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Prüfungsfragen generieren. <br className="hidden sm:inline" />
            Direkt kreuzen.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
            Anspruchsvolle Single-Choice-Fragen und Fallvignetten – mit tiefer Erklärung,
            klarem Must-Know und einer echten Lernhilfe, wenn es eine gibt. Themenwahl in Sekunden, sofort kreuzbar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/generator">
                Jetzt erste Frage generieren
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            {!loggedIn && (
              <Button asChild size="lg" variant="ghost">
                <Link href={buildLoginHref("/generator")}>Anmelden</Link>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            3 Generierungen pro Tag kostenlos · Pro erweitert auf 100 pro Tag
          </p>
        </div>
      </section>

      {/* Live-Beispiel einer generierten Frage */}
      <section className="mx-auto max-w-3xl px-2">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">So sieht eine generierte Frage aus</h2>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            Beispiel
          </Badge>
        </div>
        <DemoQuestionCard />
      </section>

      {/* Vorteile */}
      <section className="mx-auto max-w-5xl px-2 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Was den Generator stark macht</h2>
          <p className="text-sm text-muted-foreground">
            Fokus auf medizinische Tiefe und Prüfungsnähe – keine Spielereien.
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
            Beide Tarife geben dir denselben Generator. Pro entfernt nur das tägliche Limit.
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
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
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
            <p className="text-xs text-muted-foreground">
              Monatlich kündbar · Pro bleibt bis Periodenende aktiv
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/generator">Erst mal Free testen</Link>
              </Button>
              {!loggedIn ? (
                <Button asChild size="sm">
                  <Link href={buildRegisterHref("/generator")}>Kostenlos starten</Link>
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
              title: "Thema wählen",
              text: "Einzelfrage oder Fall mit 2–5 Teilfragen. Schwierigkeit 1–5.",
            },
            {
              step: "2",
              title: "Generieren",
              text: "KI erstellt Stem, Optionen, tiefe Erklärungen, Must-Know und ggf. Lernhilfe.",
            },
            {
              step: "3",
              title: "Kreuzen & lernen",
              text: "Direkt beantworten, Erklärungen aufklappen, Markierungen setzen.",
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
            <Link href="/generator">
              Zum Generator
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
