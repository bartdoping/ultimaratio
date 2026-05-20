import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { Button } from "@/components/ui/button"
import { FreeTrialExamPromo } from "@/components/free-trial-exam-promo"
import { loadFreeTrialExam } from "@/lib/free-trial-exam"

export const dynamic = "force-dynamic"

export default async function ProbierenPage() {
  const session = await getServerSession(authOptions)
  const exam = await loadFreeTrialExam()

  if (!exam) {
    redirect("/exams")
  }

  if (session?.user) {
    redirect(`/exams/${exam.slug}`)
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 py-10 px-4">
      <div className="text-center space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Kostenlos & ohne Kreditkarte
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Fragen testen – sofort loslegen
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Ein Konto reicht: danach startest du das Probedeck im echten Prüfungsmodus mit Timer, Bildern und
          Auswertung. Kein Pro-Abo nötig.
        </p>
      </div>

      <FreeTrialExamPromo exam={exam} loggedIn={false} />

      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">So läuft es ab</h2>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            <span className="text-foreground">Konto erstellen</span> – E-Mail und Passwort, Verifizierung in
            unter einer Minute.
          </li>
          <li>
            <span className="text-foreground">Probedeck starten</span> – du landest direkt auf der Prüfung und
            kannst den Durchlauf beginnen.
          </li>
          <li>
            <span className="text-foreground">Auswertung ansehen</span> – Score, Erklärungen und Review-Fokus
            wie in der echten Prüfung.
          </li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline">
            <Link href="/">Zur Startseite</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/exams">Alle Prüfungen</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
