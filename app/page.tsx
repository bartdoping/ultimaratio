import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">IMPP Coach – 2. Staatsexamen</h1>
      <p className="text-muted-foreground max-w-prose">
        Trainiere Einzelfragen und Fallvignetten. Erhalte am Ende deine Auswertung mit
        Prozentzahl und Bestehensstatus. Zahlungen via Stripe. Bilder, Laborwerte,
        Timer & Sofort-Feedback (optional) inklusive.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/exams">Zu den Prüfungen</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/register">Konto erstellen</Link>
        </Button>
      </div>
    </section>
  )
}