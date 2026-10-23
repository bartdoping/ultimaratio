import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { HomeGeneratorFocus } from "@/components/home/home-generator-focus"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Medizin-Prüfungsfragen kreuzen – ohne Warten | fragenkreuzen.de",
  description:
    "Medizinische Prüfungsfragen endlos kreuzen – ohne Wartezeit, mit kurzer Aha-Erklärung und automatischer Wiederholung deiner Fehler. Kostenlos starten, Pro unbegrenzt.",
  alternates: { canonical: "/" },
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  const loggedIn = !!session?.user

  // Angemeldete wollen kreuzen, nicht die Landingpage lesen.
  if (loggedIn) {
    redirect("/kreuzen")
  }

  return <HomeGeneratorFocus loggedIn={false} />
}
