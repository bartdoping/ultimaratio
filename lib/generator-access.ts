import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export type GeneratorUser = {
  id: string
  role: string
}

export async function requireGeneratorUser(): Promise<
  { ok: true; user: GeneratorUser } | { ok: false; status: number; error: string; upgradeRequired?: boolean }
> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "unauthorized" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: {
      id: true,
      role: true,
      subscriptionStatus: true,
      subscription: { select: { currentPeriodEnd: true } },
    },
  })

  if (!user) {
    return { ok: false, status: 401, error: "unauthorized" }
  }

  if (user.role === "admin") {
    return { ok: true, user: { id: user.id, role: user.role } }
  }

  let isPro = user.subscriptionStatus === "pro"
  const periodEnd = user.subscription?.currentPeriodEnd
  if (isPro && periodEnd && new Date(periodEnd).getTime() <= Date.now()) {
    isPro = false
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "free" },
      })
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { status: "free" },
      })
    } catch {
      // ignore
    }
  }

  if (!isPro) {
    return { ok: false, status: 403, error: "upgrade_required", upgradeRequired: true }
  }

  return { ok: true, user: { id: user.id, role: user.role } }
}
