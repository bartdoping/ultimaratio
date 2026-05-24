import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { isUserPro } from "@/lib/subscription"
import { GeneratorPageClient } from "@/components/generator/generator-page-client"
import { getGeneratorQuota } from "@/lib/generator-limits"
import { cookies, headers } from "next/headers"
import {
  createVisitorId,
  getClientIp,
  hashClientIp,
  verifyVisitorCookie,
  GENERATOR_VISITOR_COOKIE,
} from "@/lib/generator-limits"

export const dynamic = "force-dynamic"

async function loadInitialQuota() {
  const session = await getServerSession(authOptions)
  let user: { id: string; role: string } | null = null
  let isPro = false
  let isAdmin = false

  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true, role: true },
    })
    if (dbUser) {
      user = dbUser
      isAdmin = dbUser.role === "admin"
      isPro = isAdmin || (await isUserPro(dbUser.id))
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
        />
      </Suspense>
    </main>
  )
}
