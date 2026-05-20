import Link from "next/link"
import { Button } from "@/components/ui/button"

type Props = {
  examId: string
  examTitle: string
  examSlug: string
  isFreeTrialExam: boolean
  showProUpsell: boolean
}

export function PostTrialUpsell({ examId, examTitle, examSlug, isFreeTrialExam, showProUpsell }: Props) {
  if (!showProUpsell) return null

  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 shadow-sm">
      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-primary">Nächster Schritt</div>
        <h2 className="text-lg font-semibold">
          {isFreeTrialExam
            ? "Gefällt dir das Probedeck?"
            : "Weiter lernen mit vollem Zugang"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isFreeTrialExam ? (
            <>
              Du hast <strong>{examTitle}</strong> ausprobiert. Mit Pro nutzt du alle Prüfungen,
              eigene Decks und Spaced Repetition – ohne Limits.
            </>
          ) : (
            <>
              Schalte mit Pro die gesamte Fragenbank frei oder kaufe einzelne Prüfungen dauerhaft.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/subscription">Pro freischalten – 9,99 €/Monat</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/exams/${examSlug}`}>Prüfung ansehen</Link>
          </Button>
          {isFreeTrialExam && (
            <Button variant="ghost" asChild>
              <Link href={`/practice/${examId}?filter=wrong`}>Falsche Fragen üben</Link>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Keine Kreditkarte nötig für das Probedeck. Pro jederzeit monatlich kündbar.
        </p>
      </div>
    </section>
  )
}
