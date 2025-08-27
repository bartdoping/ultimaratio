// app/(dashboard)/decks/page.tsx
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import NewDeckForm from "./_client-new-deck-form"

export const runtime = "nodejs"

export default async function DecksPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Eigene Decks</h1>
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

  const decks = await prisma.deck.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Eigene Decks</h1>
        <Link href="/dashboard">
          <Button variant="outline">Zum Dashboard</Button>
        </Link>
      </div>

      {/* Neues Deck anlegen (Anker für Direktlink) */}
      <Card id="new-deck">
        <CardHeader>
          <CardTitle>Neues Deck erstellen</CardTitle>
        </CardHeader>
        <CardContent>
          <NewDeckForm />
        </CardContent>
      </Card>

      {/* Liste der Decks */}
      {decks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Decks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Lege mit dem Formular oben dein erstes persönliches Übungsdeck an.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="text-base">{d.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.description && (
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  {d._count.items} Frage{d._count.items === 1 ? "" : "n"}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Üben */}
                  <Link href={`/practice/deck/${d.id}`}>
                    <Button>Üben</Button>
                  </Link>

                  {/* Bearbeiten */}
                  <Link href={`/decks/${d.id}`}>
                    <Button variant="outline">Bearbeiten</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}