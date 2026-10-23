import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Offline", robots: { index: false } }

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Kein Netz</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Diese Seite ist offline nicht verfügbar. Im Kreuz-Modus kannst du deinen Fragenvorrat auch ohne Empfang weiterkreuzen.
      </p>
      <Link href="/kreuzen" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
        Zum Kreuz-Modus
      </Link>
    </div>
  )
}
