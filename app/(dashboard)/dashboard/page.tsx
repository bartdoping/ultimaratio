// app/(dashboard)/dashboard/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { StartExamButton } from "@/components/start-exam-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const runtime = "nodejs"

// ----- Server Action: SR an/aus je Deck (ohne Prisma-Model, per Raw SQL) -----
async function toggleDeckSRAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  const deckId = String(formData.get("deckId") || "")
  const enable = String(formData.get("enable") || "") === "1"

  // Ownership check
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } })
  if (!deck || deck.userId !== me.id) redirect("/dashboard")

  // --- SR-Tabellen robust EINZELN anlegen (ein Statement pro executeRawUnsafe!) ---
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SRUserSetting" (
      "userId"           text PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "srEnabled"        boolean NOT NULL DEFAULT true,
      "dailyNewLimit"    integer NOT NULL DEFAULT 20,
      "maxReviewsPerDay" integer NOT NULL DEFAULT 200,
      "easeFactorStart"  double precision NOT NULL DEFAULT 2.5,
      "intervalMinDays"  integer NOT NULL DEFAULT 1,
      "lapsePenalty"     double precision NOT NULL DEFAULT 0.5,
      "lastGlobalRunAt"  timestamptz
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SRDeckSetting" (
      "deckId"    text PRIMARY KEY REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "srEnabled" boolean NOT NULL DEFAULT false
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SRDeckSetting_deckId_idx" ON "SRDeckSetting" ("deckId");
  `)

  // Toggle per Upsert
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "SRDeckSetting"("deckId","srEnabled")
    VALUES ($1, $2)
    ON CONFLICT ("deckId") DO UPDATE SET "srEnabled" = EXCLUDED."srEnabled"
    `,
    deckId,
    enable
  )

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
    select: { id: true, name: true },
  })
  if (!me) {
    return <p className="text-red-600">Benutzerkonto nicht gefunden.</p>
  }

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
    select: { id: true, examId: true },
  })
  const openByExam = new Map(openAttempts.map(a => [a.examId, a.id]))

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          {srTableExists && (
            <Link href="/sr/settings">
              <Button variant="outline" className="w-full sm:w-auto">SR-Einstellungen</Button>
            </Link>
          )}
          {srTableExists && dueTotal > 0 && (
            <Link href="/sr/all">
              <Button variant="default" className="w-full sm:w-auto">SR heute: {dueTotal}</Button>
            </Link>
          )}
          <Link href="/decks">
            <Button variant="outline" className="w-full sm:w-auto">Eigene Prüfungsdecks</Button>
          </Link>
          <Link href="/dashboard/history">
            <Button variant="outline" className="w-full sm:w-auto">Historie</Button>
          </Link>
          <Link href="/exams">
            <Button className="w-full sm:w-auto">Weitere Prüfungen</Button>
          </Link>
        </div>
      </div>

      {/* Eigene Decks */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Eigene Prüfungsdecks</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/decks#new-deck">
              <Button size="sm" variant="outline" className="w-full sm:w-auto">Neues Deck</Button>
            </Link>
            <Link href="/decks">
              <Button size="sm" variant="ghost" className="w-full sm:w-auto">Alle anzeigen</Button>
            </Link>
          </div>
        </div>

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
                        {srOn && <Badge variant="secondary">SR aktiv</Badge>}
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

                      {/* SR üben: nur klickbarer Link, wenn SR aktiv; sonst disabled Button ohne Link */}
                      {srOn ? (
                        <Link href={`/sr/deck/${d.id}`}>
                          <Button size="sm" variant="default" className="w-full sm:w-auto">SR üben</Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="SR ist für dieses Deck deaktiviert" className="w-full sm:w-auto">
                          SR üben
                        </Button>
                      )}
                    </div>
                  </CardContent>

                  {/* SR Toggle */}
                  <CardContent className="flex items-center justify-between pt-0">
                    <form action={toggleDeckSRAction} className="flex items-center gap-2">
                      <input type="hidden" name="deckId" value={d.id} />
                      <input type="hidden" name="enable" value={srOn ? "0" : "1"} />
                      <Button size="sm" variant="ghost">
                        {srOn ? "SR deaktivieren" : "SR aktivieren"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Automatische Decks */}
      {autoDecks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Automatische Decks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autoDecks.map((d) => {
              const srOn = srTableExists && !!srEnabledMap.get(d.id)
              const due = (perDeckDue.get(d.id) || 0)
              return (
                <Card key={d.id} className="border-dashed">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{d.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        {srOn && <Badge variant="secondary">SR aktiv</Badge>}
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
                          <Button size="sm" variant="default">SR üben</Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="SR ist für dieses Deck deaktiviert">
                          SR üben
                        </Button>
                      )}
                    </div>
                  </CardContent>

                  <CardContent className="flex items-center justify-between pt-0">
                    <form action={toggleDeckSRAction} className="flex items-center gap-2">
                      <input type="hidden" name="deckId" value={d.id} />
                      <input type="hidden" name="enable" value={srOn ? "0" : "1"} />
                      <Button size="sm" variant="ghost">
                        {srOn ? "SR deaktivieren" : "SR aktivieren"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Aktivierte Prüfungen */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Aktivierte Prüfungen</h2>

        {purchases.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Keine Käufe gefunden</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3">Du hast noch keine Prüfung erworben.</p>
              <Link href="/exams" className="underline text-blue-600">Zu den Prüfungen</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchases.map((p) => {
              const e = p.exam
              const openAttemptId = openByExam.get(e.id) || null
              return (
                <Card key={e.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{e.title}</CardTitle>
                      <Badge variant="default">Erworben</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}

                    {openAttemptId ? (
                      <div className="flex items-center gap-3">
                        <Link href={`/exam-run/${openAttemptId}`}>
                          <Button>Weiter</Button>
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          Du hast einen offenen Versuch.
                        </span>
                      </div>
                    ) : (
                      <StartExamButton examId={e.id} />
                    )}

                    <div className="text-xs text-muted-foreground">
                      <Link href={`/exams/${e.slug}`} className="underline">Details</Link>
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