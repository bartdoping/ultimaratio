import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
import { showFreeTrialExamPromo } from "@/lib/exam-access"
import { FreeTrialExamPromo } from "@/components/free-trial-exam-promo"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await getServerSession(authOptions)
  const loggedIn = !!session?.user

  const examListWhere = (await examVisibleOnExamsPageColumnExists())
    ? ({ isPublished: true, visibleOnExamsPage: true } as const)
    : ({ isPublished: true } as const)

  let showTrialOnHome = true
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, subscriptionStatus: true },
    })
    if (me) {
      showTrialOnHome = showFreeTrialExamPromo(me.role, me.subscriptionStatus)
    }
  }

  const freeTrialExam = showTrialOnHome
    ? await prisma.exam.findFirst({
        where: { ...examListWhere, isFreeTrialDemo: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          _count: { select: { questions: true } },
        },
      })
    : null

  return (
    <main className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-background to-muted/40">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 bg-primary/40 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-20 bg-secondary/50 pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
            Neu: Spaced Repetition für eigene & automatische Decks
          </div>

          <h1 className="mt-4 text-4xl/tight font-bold tracking-tight md:text-5xl">
            Die Fragenbank für dein Medizinstudium
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">
            Trainiere Einzelfragen &amp; Fallvignetten im Prüfungs- oder Übungsmodus, mit
            Bildern, Laborwert-Suche, Timer und optionalem Sofort-Feedback. Erhalte eine
            klare Auswertung – und vertiefe mit <span className="font-medium">Spaced Repetition</span>.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/exams">Jetzt loslegen</Link>
            </Button>

            {!loggedIn ? (
              <>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/register">Kostenlos registrieren</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login?next=/decks">Eigene Decks</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">Weiter zum Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/decks">Eigene Decks</Link>
                </Button>
              </>
            )}
          </div>

          <div className="mt-5 text-xs text-muted-foreground">
            Sicher bezahlen mit Stripe · Kein Abo · DSGVO-konform
          </div>
        </div>
      </section>

      {freeTrialExam && freeTrialExam._count.questions > 0 && (
        <section className="mx-auto mt-10 max-w-5xl px-2 md:px-0">
          <h2 className="mb-3 text-center text-lg font-semibold">Erst einmal ausprobieren?</h2>
          <FreeTrialExamPromo
            exam={{
              id: freeTrialExam.id,
              slug: freeTrialExam.slug,
              title: freeTrialExam.title,
              description: freeTrialExam.description,
              questionCount: freeTrialExam._count.questions,
            }}
            loggedIn={loggedIn}
          />
        </section>
      )}

      {/* Features */}
      <section className="mx-auto mt-10 max-w-5xl px-2 md:px-0">
        <h2 className="text-center text-xl font-semibold">Warum ultima-rat.io?</h2>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Prüfungs- & Übungsmodus"
            desc="Realistischer Modus mit Timer und Auswertung oder entspanntes Üben mit optionalem Sofort-Feedback."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            }
          />
          <Feature
            title="Fallvignetten & Bilder"
            desc="Mehrteilige Fälle und Bildfragen – alles übersichtlich mit Lightbox."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M3 7h18v10H3zM8 14l2-2 2 2 3-3 3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            }
          />
          <Feature
            title="Laborwerte-Suche"
            desc="Laborwerte jederzeit per Shortcut (L) einblendbar – schnell & kontextbezogen."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M9 3v6l-4 8a6 6 0 1014 0l-4-8V3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            }
          />
          <Feature
            title="Eigene & automatische Decks"
            desc="Lege Themen-Decks an oder nutze Auto-Decks für markierte & falsch beantwortete Fragen."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M4 6h16v12H4zM8 10h8M8 14h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            }
          />
          <Feature
            title="Spaced Repetition"
            desc="Deine Decks mit Karteisystem trainieren – global oder deck-spezifisch steuerbar."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M4 7h10l2 2h4v8H4z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            }
          />
          <Feature
            title="Auswertung & Verlauf"
            desc="Klares Feedback mit Prozenten, Bestehen, Historie und Ziel-Listen (offen, markiert, falsch)."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M4 19h16M7 16V8m5 8V5m5 11v-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            }
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-12 max-w-5xl rounded-xl border bg-card px-6 py-8">
        <h2 className="text-center text-xl font-semibold">So funktioniert’s</h2>
        <ol className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Step n={1} title="Prüfung wählen">
            Wähle deine gekaufte Prüfung und starte einen Versuch – echt oder zum Üben.
          </Step>
          <Step n={2} title="Antworten & Auswertung">
            Beantworte die Fragen, erhalte deine Auswertung, markiere & sichere in Decks.
          </Step>
          <Step n={3} title="Nachhaltig wiederholen">
            Aktiviere Spaced Repetition für Decks und trainiere täglich fällige Karten.
          </Step>
        </ol>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/exams">Prüfungen ansehen</Link>
          </Button>
          {loggedIn ? (
            <Button asChild variant="outline">
              <Link href="/dashboard">Zum Dashboard</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/register">Konto erstellen</Link>
            </Button>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-10 max-w-5xl rounded-xl border bg-gradient-to-r from-primary/5 to-secondary/10 px-6 py-8 text-center">
        <h3 className="text-lg font-semibold">Bereit, klüger zu lernen?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Starte noch heute – sichere Fragen, wiederhole gezielt und behalte den Überblick.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button asChild>
            <Link href="/exams">Los geht’s</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={loggedIn ? "/decks" : "/login?next=/decks"}>Eigene Decks</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

/* ---------- kleine Presentational-Helper ---------- */

function Feature({
  title,
  desc,
  icon,
}: {
  title: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground">
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-lg border bg-background p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-7 w-7 place-items-center rounded-full border text-sm font-semibold">
          {n}
        </div>
        <div className="font-medium">{title}</div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </li>
  )
}