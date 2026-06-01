import { Suspense } from "react"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { isUserPro } from "@/lib/subscription"
import { GeneratorPageClient } from "@/components/generator/generator-page-client"
import { OnboardingModal } from "@/components/onboarding/onboarding-modal"
import { getGeneratorQuota } from "@/lib/generator-limits"
import { cookies, headers } from "next/headers"
import {
  createVisitorId,
  hashClientIp,
  verifyVisitorCookie,
  GENERATOR_VISITOR_COOKIE,
} from "@/lib/generator-limits"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Generator – KI-Prüfungsfragen | fragenkreuzen.de",
  description:
    "Generiere medizinische Single-Choice-Fragen und Fallvignetten mit KI – inklusive Erklärungen, Lernziel und Prüfungsfalle.",
  alternates: { canonical: "/generator" },
}

async function loadInitialQuota() {
  const session = await getServerSession(authOptions)
  let user: { id: string; role: string } | null = null
  let isPro = false
  let isAdmin = false
  let trialEligible = false
  let trialEndsAt: string | null = null
  let onboardingNeeded = false

  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: {
        id: true,
        role: true,
        proTrialStartedAt: true,
        proTrialEndsAt: true,
        onboardingCompletedAt: true,
      },
    })
    if (dbUser) {
      user = { id: dbUser.id, role: dbUser.role }
      isAdmin = dbUser.role === "admin"
      isPro = isAdmin || (await isUserPro(dbUser.id))
      // Trial-Eligibility (nicht Admin, nicht aktiv, noch nicht genutzt)
      if (!isAdmin && !isPro && !dbUser.proTrialStartedAt) {
        trialEligible = true
      }
      if (dbUser.proTrialEndsAt) {
        trialEndsAt = dbUser.proTrialEndsAt.toISOString()
      }
      onboardingNeeded = !dbUser.onboardingCompletedAt && !isAdmin
    }
  }

  const jar = await cookies()
  const signedCookie = jar.get(GENERATOR_VISITOR_COOKIE)?.value
  const anonKey = verifyVisitorCookie(signedCookie) ?? createVisitorId()

  const hdrs = await headers()
  const ipHash = hashClientIp(
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip")
  )

  const quota = await getGeneratorQuota(
    user
      ? {
          userId: user.id,
          ipHash: isPro || isAdmin ? null : ipHash,
          isPro,
          isAdmin,
        }
      : { anonKey, ipHash, isPro: false, isAdmin: false }
  )

  return {
    isLoggedIn: !!user,
    isPro,
    quota,
    trialEligible,
    trialEndsAt,
    onboardingNeeded,
  }
}

export default async function GeneratorPage() {
  const initial = await loadInitialQuota()

  return (
    <main className="py-8 px-4">
      <Suspense fallback={<div className="mx-auto max-w-lg text-center text-sm text-muted-foreground">Lade Generator…</div>}>
        <GeneratorPageClient
          initialIsLoggedIn={initial.isLoggedIn}
          initialIsPro={initial.isPro}
          initialQuota={initial.quota}
          initialTrialEligible={initial.trialEligible}
          initialTrialEndsAt={initial.trialEndsAt}
        />
      </Suspense>
      {initial.onboardingNeeded && <OnboardingModal autoOpen />}
    </main>
  )
}
