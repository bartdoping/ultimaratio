import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { StartExamButton } from "@/components/start-exam-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const runtime = "nodejs"

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

  // Auto-Decks separat (nur wenn vorhanden)
  const autoDecks = await prisma.deck.findMany({
    where: { userId: me.id, isAuto: true },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  })

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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Mein Bereich</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/decks">
            <Button variant="outline">Eigene Prüfungsdecks</Button>
          </Link>
          <Link href="/dashboard/history">
            <Button variant="outline">Historie</Button>
          </Link>
          <Link href="/exams">
            <Button>Weitere Prüfungen</Button>
          </Link>
        </div>
      </div>

      {/* Eigene Decks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Eigene Prüfungsdecks</h2>
          <div className="flex gap-2">
            <Link href="/decks#new-deck">
              <Button size="sm" variant="outline">Neues Deck</Button>
            </Link>
            <Link href="/decks">
              <Button size="sm" variant="ghost">Alle anzeigen</Button>
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
            {decks.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  {d.description && (
                    <CardDescription className="line-clamp-2">
                      {d.description}
                    </CardDescription>
                  )}
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
                      <Button size="sm">Training starten</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Automatische Decks */}
      {autoDecks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Automatische Decks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autoDecks.map((d) => (
              <Card key={d.id} className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">{d.title}</CardTitle>
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
                      <Button size="sm">Training starten</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Erworbene Prüfungen */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Erworbene Prüfungen</h2>
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
                        <span className="text-sm text-muted-foreground">Du hast einen offenen Versuch.</span>
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