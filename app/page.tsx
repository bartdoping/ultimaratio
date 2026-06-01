import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { isAdminRole } from "@/lib/platform-access"
import { HomeLegacy } from "@/components/home/home-legacy"
import { HomeGeneratorFocus } from "@/components/home/home-generator-focus"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Prüfungsfragen generieren. Direkt kreuzen. | fragenkreuzen.de",
  description:
    "Anspruchsvolle Single-Choice-Fragen und Fallvignetten mit KI – inklusive Erklärungen, Lernziel und Prüfungsfalle. Free 3/Tag, Pro 100/Tag für 9,99 €/Monat, 7 Tage gratis testen.",
  alternates: { canonical: "/" },
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  const loggedIn = !!session?.user

  let isAdmin = false
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { role: true },
    })
    isAdmin = isAdminRole(me?.role)
  }

  if (isAdmin) {
    return <HomeLegacy />
  }

  if (loggedIn) {
    redirect("/generator")
  }

  return <HomeGeneratorFocus loggedIn={false} />
}
