import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UpcomingFeaturesGrid } from "@/components/platform/upcoming-features-grid"
import { isAdminRole } from "@/lib/platform-access"

export default async function ComingSoonPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.email) {
    const role = (session.user as { role?: string }).role
    if (isAdminRole(role)) {
      redirect("/")
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14 space-y-10">
      <div className="text-center space-y-4">
        <Badge variant="secondary">Coming Soon</Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Dieser Bereich ist noch in Arbeit
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Wir konzentrieren uns gerade auf den KI-Fragen-Generator. Die vollständige Lernplattform
          mit Prüfungen, Decks und Spaced Repetition kommt bald.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/generator">Zum Generator</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Zur Startseite</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-center text-lg font-semibold">Das erwartet dich</h2>
        <UpcomingFeaturesGrid />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Du kannst den Generator weiterhin nutzen – ohne Wartezeit.
      </p>
    </div>
  )
}
