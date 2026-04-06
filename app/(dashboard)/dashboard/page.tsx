// app/(dashboard)/dashboard/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { cn } from "@/lib/utils"
import { canUsePersonalDecks } from "@/lib/decks-access"
import { StartExamButton } from "@/components/start-exam-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubscriptionSuccessHandler } from "@/components/subscription-success-handler"
import { DeleteAttemptButton } from "@/components/delete-attempt-button"
import { DashboardStats } from "@/components/dashboard-stats"
import { examVisibleOnExamsPageColumnExists } from "@/lib/exam-visible-on-exams-page-column"
import { showFreeTrialExamPromo } from "@/lib/exam-access"
import { FreeTrialExamPromo } from "@/components/free-trial-exam-promo"

export const runtime = "nodejs"

// ----- Server Action: SR an/aus je Deck (ohne Prisma-Model, per Raw SQL) -----
async function toggleDeckSRAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, subscriptionStatus: true },
  })
  if (!me) redirect("/login")
  if (!canUsePersonalDecks(me.role, me.subscriptionStatus)) {
    redirect("/subscription")
  }

  const deckId = String(formData.get("deckId") || "")
  const enable = String(formData.get("enable") || "") === "1"
  if (!deckId) redirect("/dashboard")

  // Ownership check
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } })
  if (!deck || deck.userId !== me.id) redirect("/dashboard")

  try {
    await prisma.sRDeckSetting.upsert({
      where: { deckId },
      update: { srEnabled: enable },
      create: { deckId, srEnabled: enable },
      select: { deckId: true },
    })
  } catch (e: any) {
    // Wenn SR-Tabellen noch nicht migriert sind, zu den SR-Einstellungen leiten
    if (e?.code === "P2021") {
      redirect("/sr/settings")
    }
    console.error("toggleDeckSRAction failed:", e)
    redirect("/dashboard")
  }

  redirect("/dashboard")
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <p>Bitte zuerst einloggen.</p>
        <Link href="/login" className="underline text-blue-600">Zum Login</Link>
      </div>
    )
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, role: true, subscriptionStatus: true },
  })
  if (!me) {
    return <p className="text-red-600">Benutzerkonto nicht gefunden.</p>
  }

  const canUseDecks = canUsePersonalDecks(me.role, me.subscriptionStatus)

  const examListWhere = (await examVisibleOnExamsPageColumnExists())
    ? ({ isPublished: true, visibleOnExamsPage: true } as const)
    : ({ isPublished: true } as const)

  const freeTrialExamRow =
    showFreeTrialExamPromo(me.role, me.subscriptionStatus)
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

  const freeTrialExamDash =
    freeTrialExamRow && freeTrialExamRow._count.questions > 0 ? freeTrialExamRow : null

  // Eigene (nicht-automatische) Decks
  const decks = await prisma.deck.findMany({
    where: { userId: me.id, isAuto: false },
    orderBy: { updatedAt: "desc" },
    take: 4,
    include: { _count: { select: { items: true } } },
  })

  // Auto-Decks
  const autoDecks = await prisma.deck.findMany({
    where: { userId: me.id, isAuto: true },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  })

  // ---- SR: prüfen, ob SRDeckSetting existiert; Flags + Due-Counter laden ---
  const allDeckIds = [...decks.map(d => d.id), ...autoDecks.map(d => d.id)]
  let srTableExists = false
  let srEnabledMap = new Map<string, boolean>()
  let dueTotal = 0
  let perDeckDue = new Map<string, number>()

  try {
    const ex = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'SRDeckSetting' AND relkind = 'r'
      ) AS "exists";
    `
    srTableExists = !!ex?.[0]?.exists

    if (srTableExists && allDeckIds.length > 0) {
      const rows = await prisma.$queryRaw<{ deckId: string; srEnabled: boolean }[]>`
        SELECT "deckId","srEnabled" FROM "SRDeckSetting"
        WHERE "deckId" IN (${Prisma.join(allDeckIds)})
      `
      srEnabledMap = new Map(rows.map(r => [r.deckId, r.srEnabled]))

      // Gesamt fällige Reviews (nur SR-aktivierte Decks)
      const enabledDeckIds = rows.filter(r => r.srEnabled).map(r => r.deckId)
      if (enabledDeckIds.length > 0) {
        const tot = await prisma.$queryRaw<{ cnt: number }[]>`
          SELECT COUNT(*)::int AS cnt
          FROM "ReviewItem" ri
          JOIN "DeckItem" di ON di."questionId" = ri."questionId"
          WHERE ri."userId" = ${me.id}
            AND ri."dueAt" <= NOW()
            AND di."deckId" IN (${Prisma.join(enabledDeckIds)});
        `
        dueTotal = tot?.[0]?.cnt ?? 0

        // Per-Deck
        const per = await prisma.$queryRaw<{ deckId: string; cnt: number }[]>`
          SELECT di."deckId", COUNT(*)::int AS cnt
          FROM "ReviewItem" ri
          JOIN "DeckItem" di ON di."questionId" = ri."questionId"
          WHERE ri."userId" = ${me.id}
            AND ri."dueAt" <= NOW()
            AND di."deckId" IN (${Prisma.join(enabledDeckIds)})
          GROUP BY di."deckId";
        `
        perDeckDue = new Map(per.map(r => [r.deckId, r.cnt]))
      }
    }
  } catch {
    // Keine SR-Anzeige, aber auch kein Crash
  }

  // Käufe (inkl. Exam) + offene Versuche
  const purchases = await prisma.purchase.findMany({
    where: { userId: me.id },
    include: { exam: { select: { id: true, title: true, slug: true, description: true } } },
    orderBy: { createdAt: "desc" },
  })

  const openAttempts = await prisma.attempt.findMany({
    where: { userId: me.id, finishedAt: null },
    select: { 
      id: true, 
      examId: true, 
      startedAt: true,
      elapsedSec: true,
      exam: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true
        }
      }
    },
    orderBy: { startedAt: "desc" }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <SubscriptionSuccessHandler />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          {srTableExists && (
            <Link href="/sr/settings">
              <Button variant="outline" className="w-full sm:w-auto">Spaced Repetition · Einstellungen</Button>
            </Link>
          )}
          {srTableExists && dueTotal > 0 && (
            <Link href="/sr/all">
              <Button variant="default" className="w-full sm:w-auto">Spaced Repetition heute: {dueTotal}</Button>
            </Link>
          )}
          {canUseDecks ? (
            <Link href="/decks">
              <Button variant="outline" className="w-full sm:w-auto">
                Eigene Prüfungsdecks
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled
              title="Pro-Feature: Eigene Prüfungsdecks"
            >
              Eigene Prüfungsdecks
            </Button>
          )}
          <Link href="/dashboard/history">
            <Button variant="outline" className="w-full sm:w-auto">Historie</Button>
          </Link>
          <Link href="/exams">
            <Button className="w-full sm:w-auto">Weitere Prüfungen</Button>
          </Link>
        </div>
      </div>

      {freeTrialExamDash && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Prüfung kostenlos testen</h2>
          <FreeTrialExamPromo
            exam={{
              id: freeTrialExamDash.id,
              slug: freeTrialExamDash.slug,
              title: freeTrialExamDash.title,
              description: freeTrialExamDash.description,
              questionCount: freeTrialExamDash._count.questions,
            }}
            loggedIn
          />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Deine Statistiken</h2>
        <DashboardStats />
      </section>

      {/* Eigene Decks */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Eigene Prüfungsdecks</h2>
        {!canUseDecks && (
          <p className="text-sm text-muted-foreground">
            Mit{" "}
            <Link href="/subscription" className="underline font-medium text-foreground">
              Pro
            </Link>{" "}
            kannst du eigene Übungsdecks anlegen und verwalten.
          </p>
        )}

        <div className={cn("relative rounded-lg", !canUseDecks && "min-h-[140px]")}>
          {!canUseDecks && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/60 px-4 text-center backdrop-blur-[1px]">
              <span className="text-sm font-medium">Pro-Feature</span>
              <Button asChild size="sm">
                <Link href="/subscription">Upgrade ansehen</Link>
              </Button>
            </div>
          )}
          <div
            className={cn(
              !canUseDecks &&
                "pointer-events-none select-none blur-[7px] opacity-55 saturate-50"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="sr-only">Deck-Aktionen</span>
              <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                <Link href="/decks#new-deck">
                  <Button size="sm" variant="outline" className="w-full sm:w-auto">
                    Neues Deck
                  </Button>
                </Link>
                <Link href="/decks">
                  <Button size="sm" variant="ghost" className="w-full sm:w-auto">
                    Alle anzeigen
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-3">
        {decks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Du hast noch keine Decks</CardTitle>
              <CardDescription>
                Erstelle dir thematische Übungsdecks aus deinen erworbenen Fragen – z. B. „Anatomie · Gelenke“ oder „Bildfragen“.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/decks#new-deck">
                <Button>Neues Deck anlegen</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.map((d) => {
              const srOn = srTableExists && !!srEnabledMap.get(d.id)
              const due = perDeckDue.get(d.id) || 0
              return (
                <Card key={d.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{d.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        {srOn && <Badge variant="secondary">Spaced Repetition aktiv</Badge>}
                        {srOn && due > 0 && <Badge variant="default">{due} fällig</Badge>}
                      </div>
                    </div>
                    {d.description && (
                      <CardDescription className="line-clamp-2">
                        {d.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {d._count.items} Frage{d._count.items === 1 ? "" : "n"}
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Link href={`/decks/${d.id}`}>
                        <Button size="sm" variant="outline" className="w-full sm:w-auto">Öffnen</Button>
                      </Link>
                      <Link href={`/practice/deck/${d.id}`}>
                        <Button size="sm" className="w-full sm:w-auto">Training</Button>
                      </Link>

                      {/* Spaced Repetition üben: nur klickbarer Link, wenn aktiv; sonst disabled Button ohne Link */}
                      {srOn ? (
                        <Link href={`/sr/deck/${d.id}`}>
                          <Button size="sm" variant="default" className="w-full sm:w-auto">Spaced Repetition üben</Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="Spaced Repetition ist für dieses Deck deaktiviert" className="w-full sm:w-auto">
                          Spaced Repetition üben
                        </Button>
                      )}
                    </div>
                  </CardContent>

                  {/* Spaced Repetition Toggle */}
                  <CardContent className="flex items-center justify-between pt-0">
                    <form action={toggleDeckSRAction} className="flex items-center gap-2">
                      <input type="hidden" name="deckId" value={d.id} />
                      <input type="hidden" name="enable" value={srOn ? "0" : "1"} />
                      <Button size="sm" variant="ghost">
                        {srOn ? "Spaced Repetition deaktivieren" : "Spaced Repetition aktivieren"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
            </div>
          </div>
        </div>
      </section>

      {/* Automatische Decks */}
      {autoDecks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Automatische Decks</h2>
          {!canUseDecks && (
            <p className="text-sm text-muted-foreground">
              Automatische Decks sind Teil von Pro.
            </p>
          )}
          <div
            className={cn(
              "relative rounded-lg",
              !canUseDecks && "min-h-[100px]"
            )}
          >
            {!canUseDecks && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/60 px-4 text-center backdrop-blur-[1px]">
                <span className="text-sm font-medium">Pro-Feature</span>
                <Button asChild size="sm">
                  <Link href="/subscription">Upgrade ansehen</Link>
                </Button>
              </div>
            )}
            <div
              className={cn(
                "grid grid-cols-1 gap-4 md:grid-cols-2",
                !canUseDecks &&
                  "pointer-events-none select-none blur-[7px] opacity-55 saturate-50"
              )}
            >
            {autoDecks.map((d) => {
              const srOn = srTableExists && !!srEnabledMap.get(d.id)
              const due = (perDeckDue.get(d.id) || 0)
              return (
                <Card key={d.id} className="border-dashed">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{d.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        {srOn && <Badge variant="secondary">Spaced Repetition aktiv</Badge>}
                        {srOn && due > 0 && <Badge variant="default">{due} fällig</Badge>}
                      </div>
                    </div>
                    <CardDescription>Wird automatisch befüllt (nicht löschbar).</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {d._count.items} Frage{d._count.items === 1 ? "" : "n"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link href={`/decks/${d.id}`}>
                        <Button size="sm" variant="outline">Öffnen</Button>
                      </Link>
                      <Link href={`/practice/deck/${d.id}`}>
                        <Button size="sm">Training</Button>
                      </Link>

                      {srOn ? (
                        <Link href={`/sr/deck/${d.id}`}>
                          <Button size="sm" variant="default">Spaced Repetition üben</Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="Spaced Repetition ist für dieses Deck deaktiviert">
                          Spaced Repetition üben
                        </Button>
                      )}
                    </div>
                  </CardContent>

                  <CardContent className="flex items-center justify-between pt-0">
                    <form action={toggleDeckSRAction} className="flex items-center gap-2">
                      <input type="hidden" name="deckId" value={d.id} />
                      <input type="hidden" name="enable" value={srOn ? "0" : "1"} />
                      <Button size="sm" variant="ghost">
                        {srOn ? "Spaced Repetition deaktivieren" : "Spaced Repetition aktivieren"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )
            })}
            </div>
          </div>
        </section>
      )}

      {/* Aktive Prüfungen */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Aktive Prüfungen</h2>

        {openAttempts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Keine offenen Prüfungen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3">Du hast derzeit keine offenen Prüfungsdurchläufe.</p>
              <Link href="/exams" className="underline text-blue-600">Zu den Prüfungen</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openAttempts.map((attempt) => {
              const exam = attempt.exam
              const startTime = new Date(attempt.startedAt)
              const elapsedMinutes = Math.floor((attempt.elapsedSec || 0) / 60)
              
              return (
                <Card key={attempt.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{exam.title}</CardTitle>
                      <Badge variant="secondary">Offen</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {exam.description && <p className="text-sm text-muted-foreground">{exam.description}</p>}
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Gestartet: {startTime.toLocaleDateString('de-DE')} um {startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                      {elapsedMinutes > 0 && <div>Verstrichene Zeit: {elapsedMinutes} Min</div>}
                    </div>

                    <div className="flex items-center gap-3">
                      <Link href={`/exam-run/${attempt.id}`}>
                        <Button>Weiter</Button>
                      </Link>
                      <DeleteAttemptButton attemptId={attempt.id} />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <Link href={`/exams/${exam.slug}`} className="underline">Details</Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}