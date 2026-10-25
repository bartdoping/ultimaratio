import type { Metadata } from "next"
import Link from "next/link"
import { BarChart3, Bot, Flag, Microscope, ShieldCheck, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "So entstehen unsere Fragen",
  description:
    "Wie fragenkreuzen Prüfungsfragen erzeugt, prüft und aussortiert — und wo die Grenzen liegen.",
  alternates: { canonical: "/so-entstehen-unsere-fragen" },
}

const SCHRITTE = [
  {
    icon: Bot,
    titel: "1. Entwurf nach festem Regelwerk",
    text: "Ein KI-Sprachmodell (OpenAI) schreibt die Frage nach unserem Prüfungsregelwerk: Single Choice im Stil des schriftlichen Staatsexamens, fünf Antworten, genau eine richtig, Schwierigkeit von Basis bis Fallstricke.",
  },
  {
    icon: ShieldCheck,
    titel: "2. Keine verräterischen Antworten",
    text: "Eine automatische Prüfung sucht nach Hinweisen, mit denen man die Lösung ohne Wissen errät — auffällige Länge, Signalwörter, die einzige vorsichtige Formulierung. Fällt eine Frage auf, wird sie nachgebessert.",
  },
  {
    icon: Microscope,
    titel: "3. Unabhängiger fachlicher Gegencheck",
    text: "Ein zweites Modell prüft ohne Kenntnis des Entwurfs: Ist die markierte Antwort die etablierte beste? Wäre eine andere ebenfalls vertretbar? Gibt es erfundene Fachbegriffe? Beanstandete Fragen werden nachgebessert.",
  },
  {
    icon: Sparkles,
    titel: "4. Kurze Erklärung zu jeder Antwort",
    text: "Zu jeder Option ein Satz, warum sie stimmt oder nicht — und wann sie richtig wäre. Dazu der eine Aha-Satz, der hängen bleibt. Wer mehr will, tippt auf „Mehr verstehen“.",
  },
  {
    icon: BarChart3,
    titel: "5. Kontrolle durch echte Antworten",
    text: "Jede Antwort fließt anonym in die Statistik der Frage. Fragen, bei denen starke Kreuzer häufiger danebenliegen als schwache (nach mindestens 30 Antworten), oder die mehrfach gemeldet werden (ab 3 Meldungen bzw. 10 % der Antworten), nehmen wir automatisch aus dem Fragenpool.",
  },
  {
    icon: Flag,
    titel: "6. Deine Meldung zählt",
    text: "Unter jeder aufgelösten Frage steht „Frage melden“. Jede Meldung landet bei uns und zählt sofort für die automatische Aussortierung.",
  },
] as const

export default function SoEntstehenUnsereFragenPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="text-xs font-medium uppercase tracking-wide text-primary">Transparenz</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">So entstehen unsere Fragen</h1>
      <p className="mt-3 text-muted-foreground">
        Alle Fragen auf fragenkreuzen sind KI-erzeugt. Damit du ihnen trauen kannst, durchläuft jede mehrere Prüfungen —
        und wird danach von allen, die sie kreuzen, mitgeprüft.
      </p>

      <ol className="mt-8 space-y-4">
        {SCHRITTE.map((s) => (
          <li key={s.titel} className="flex gap-4 rounded-2xl border bg-card p-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold">{s.titel}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed">
        <h2 className="font-semibold">Ehrlich: die Grenzen</h2>
        <p className="mt-1 text-muted-foreground">
          Auch nach allen Prüfungen kann eine KI-erzeugte Frage fachlich danebenliegen. Die Fragen werden derzeit nicht
          einzeln von Ärztinnen und Ärzten freigegeben. Sie dienen dem Üben — maßgeblich bleiben Lehrbuch, aktuelle
          Leitlinien und deine Dozierenden. Wenn dir etwas falsch vorkommt: bitte melden.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/kreuzen" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
          Jetzt kreuzen
        </Link>
        <Link href="/faq" className="inline-flex h-11 items-center rounded-full border px-6 text-sm font-medium hover:bg-muted">
          Häufige Fragen
        </Link>
      </div>
    </div>
  )
}
