// lib/subscription.ts
import prisma from "@/lib/db"

export type ProAccessKind = "none" | "subscription" | "trial" | "admin"

export type ProAccessSnapshot = {
  isPro: boolean
  kind: ProAccessKind
  /** Wann läuft das aktive (oder abgelaufene) Trial. null wenn nie ein Trial gestartet. */
  trialEndsAt: Date | null
}

/**
 * Liefert detaillierte Pro-Access-Information:
 * - `kind` zeigt, woher der Pro-Status kommt (Subscription / Trial / Admin).
 * - `isPro` ist true, sobald irgendeine aktive Quelle existiert.
 */
export async function getProAccess(userId: string): Promise<ProAccessSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      role: true,
      proTrialEndsAt: true,
      subscription: {
        select: {
          currentPeriodEnd: true,
          stripeSubscriptionId: true,
        },
      },
    },
  })

  if (!user) return { isPro: false, kind: "none", trialEndsAt: null }
  if (user.role === "admin") return { isPro: true, kind: "admin", trialEndsAt: null }

  // 1) Aktives Stripe-Abo → Pro
  if (user.subscriptionStatus === "pro") {
    const periodEnd = user.subscription?.currentPeriodEnd
    if (!periodEnd || new Date(periodEnd).getTime() > Date.now()) {
      return {
        isPro: true,
        kind: "subscription",
        trialEndsAt: user.proTrialEndsAt ?? null,
      }
    }
    // Best-effort Self-Heal: nicht mehr pro, wenn Period-Ende abgelaufen ist.
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: "free" },
      })
      await prisma.subscription.update({
        where: { userId },
        data: { status: "free" },
      })
    } catch {
      // ignore
    }
  }

  // 2) Aktives Trial → Pro
  const trialEnd = user.proTrialEndsAt
  if (trialEnd && new Date(trialEnd).getTime() > Date.now()) {
    return { isPro: true, kind: "trial", trialEndsAt: trialEnd }
  }

  return { isPro: false, kind: "none", trialEndsAt: trialEnd ?? null }
}

export async function isUserPro(userId: string): Promise<boolean> {
  const snap = await getProAccess(userId)
  return snap.isPro
}

export async function ensureAdminProStatus() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true, subscriptionStatus: true },
    })

    for (const admin of admins) {
      if (admin.subscriptionStatus !== "pro") {
        await prisma.user.update({
          where: { id: admin.id },
          data: { subscriptionStatus: "pro" },
        })

        console.log(`Admin ${admin.email} set to Pro status`)
      }
    }
  } catch (error) {
    console.error("Error ensuring admin pro status:", error)
  }
}
