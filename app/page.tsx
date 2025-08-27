import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">IMPP Coach – 2. Staatsexamen</h1>
      <p className="text-muted-foreground max-w-prose">
        Trainiere Einzelfragen und Fallvignetten. Erhalte am Ende deine Auswertung mit
        Prozentzahl und Bestehensstatus. Zahlungen via Stripe. Bilder, Laborwerte,
        Timer &amp; Sofort-Feedback (optional) inklusive.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/exams">Zu den Prüfungen</Link>
        </Button>

        <Button asChild variant="secondary">
          <Link href="/register">Konto erstellen</Link>
        </Button>

        {/* Neuer Einstieg: Eigene Prüfungsdecks */}
        {session?.user ? (
          <Button asChild variant="outline">
            <Link href="/decks">Eigene Prüfungsdecks</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login?next=/decks">Eigene Prüfungsdecks</Link>
          </Button>
        )}
      </div>
    </section>
  )
}