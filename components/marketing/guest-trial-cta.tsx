import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buildLoginHref, buildRegisterHref } from "@/lib/auth-redirect"

type Props = {
  examTitle: string
  examSlug: string
  questionCount: number
}

export function GuestTrialCta({ examTitle, examSlug, questionCount }: Props) {
  const nextPath = `/exams/${examSlug}`

  return (
    <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary text-primary-foreground">Kostenlos</Badge>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Probedeck</span>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Kostenlos testen – Konto in einer Minute</h3>
        <p className="text-sm text-muted-foreground">
          Registriere dich kostenlos und starte direkt <strong>{examTitle}</strong> im Prüfungsmodus mit Timer
          und Auswertung ({questionCount} Frage{questionCount === 1 ? "" : "n"}). Keine Kreditkarte nötig.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={buildRegisterHref(nextPath)}>Kostenlos starten</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={buildLoginHref(nextPath)}>Bereits Konto? Einloggen</Link>
        </Button>
      </div>
    </div>
  )
}
