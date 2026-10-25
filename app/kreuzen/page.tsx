import { Suspense } from "react"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { cookies } from "next/headers"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { isUserPro } from "@/lib/subscription"
import { themenBilanz } from "@/lib/saved-questions"
import { KreuzenApp, type KreuzenStats } from "@/components/kreuzen/kreuzen-app"
import { REFERRAL, attributionForCode } from "@/lib/referral"
import { planChoices } from "@/lib/stripe-plans"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Kreuzen – endlos Prüfungsfragen | fragenkreuzen.de",
  description:
    "Kreuze medizinische Prüfungsfragen ohne Wartezeit: sofortige Auflösung, kurze Aha-Erklärung, automatische Wiederholung deiner Fehler.",
  alternates: { canonical: "/kreuzen" },
}

const LEER: KreuzenStats = { heute: 0, woche: 0, quote7: null, dueCount: 0, schwache: [], dailyGoal: 30, reminderOptIn: false }

async function loadStats(): Promise<{ isLoggedIn: boolean; isPro: boolean; stats: KreuzenStats }> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email) return { isLoggedIn: false, isPro: false, stats: LEER }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, dailyGoal: true, reminderOptIn: true } })
  if (!user) return { isLoggedIn: false, isPro: false, stats: LEER }

  const jetzt = new Date()
  const tagesbeginn = new Date(jetzt)
  tagesbeginn.setHours(0, 0, 0, 0)
  const vor7 = new Date(jetzt.getTime() - 7 * 86_400_000)

  const [isPro, heute, woche, wocheRichtig, dueCount, bilanzZeilen] = await Promise.all([
    user.role === "admin" ? Promise.resolve(true) : isUserPro(user.id),
    prisma.poolAnswer.count({ where: { userId: user.id, createdAt: { gte: tagesbeginn } } }),
    prisma.poolAnswer.count({ where: { userId: user.id, createdAt: { gte: vor7 } } }),
    prisma.poolAnswer.count({ where: { userId: user.id, createdAt: { gte: vor7 }, correct: true } }),
    prisma.savedQuestion.count({ where: { userId: user.id, mode: "single", dueAt: { lte: jetzt } } }),
    prisma.savedQuestion.findMany({
      where: { userId: user.id, attempts: { gt: 0 } },
      select: { topic: true, attempts: true, correctCount: true },
      take: 2000,
    }),
  ])

  const schwache = themenBilanz(bilanzZeilen)
    .filter((t) => t.attempts >= 3 && t.quote < 80)
    .slice(0, 3)
    .map((t) => ({ topic: t.topic, quote: t.quote }))

  return {
    isLoggedIn: true,
    isPro,
    stats: {
      heute,
      woche,
      quote7: woche > 0 ? Math.round((wocheRichtig / woche) * 100) : null,
      dueCount,
      schwache,
      dailyGoal: user.dailyGoal,
      reminderOptIn: user.reminderOptIn,
    },
  }
}

export default async function KreuzenPage() {
  const { isLoggedIn, isPro, stats } = await loadStats()
  // Banner nur bei echter Empfehlung (nicht bei Creator-Codes — dort gibt es keine Belohnung).
  const refCode = isLoggedIn ? null : (await cookies()).get(REFERRAL.COOKIE)?.value
  const eingeladen = !!refCode && !!(await attributionForCode(refCode)).referredById
  // Tarife nur laden, wenn sie gezeigt werden können (angemeldet, kein Pro).
  const plaene = isLoggedIn && !isPro ? await planChoices().catch(() => []) : []
  return (
    <div>
      <Suspense fallback={null}>
        <KreuzenApp isLoggedIn={isLoggedIn} isPro={isPro} stats={stats} eingeladen={eingeladen} plaene={plaene} />
      </Suspense>
    </div>
  )
}
