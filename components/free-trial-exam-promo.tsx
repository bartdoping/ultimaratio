import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StartExamButton } from "@/components/start-exam-button"

export type FreeTrialExamPayload = {
  id: string
  slug: string
  title: string
  description: string
  questionCount: number
}

type Props = {
  exam: FreeTrialExamPayload
  /** Wenn false: CTAs führen zu Login/Registrierung mit Hinweis auf die Prüfung. */
  loggedIn: boolean
  className?: string
}

export function FreeTrialExamPromo({ exam, loggedIn, className }: Props) {
  const nextPath = `/exams/${exam.slug}`

  return (
    <Card
      className={
        className ??
        "border-primary/40 bg-gradient-to-br from-primary/10 via-background to-secondary/10 shadow-md"
      }
    >
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">Kostenlos testen</Badge>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Probedeck
          </span>
        </div>
        <CardTitle className="text-xl md:text-2xl">{exam.title}</CardTitle>
        <CardDescription className="text-base text-foreground/80">
          {exam.description}
        </CardDescription>
        <p className="text-sm text-muted-foreground">
          {exam.questionCount} Frage{exam.questionCount === 1 ? "" : "n"} · Prüfungsmodus mit Timer und
          Auswertung
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {loggedIn ? (
          <>
            <StartExamButton examId={exam.id} />
            <Button asChild variant="outline">
              <Link href={nextPath}>Details</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild>
              <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>Registrieren &amp; testen</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Einloggen</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={nextPath}>Mehr erfahren</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
