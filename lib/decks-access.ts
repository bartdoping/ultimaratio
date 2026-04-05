import type { Role, SubscriptionStatus } from "@prisma/client"
import { NextResponse } from "next/server"
import prisma from "@/lib/db"

/** Eigene / automatische Prüfungsdecks: Pro oder Admin. */
export function canUsePersonalDecks(
  role: Role,
  subscriptionStatus: SubscriptionStatus
): boolean {
  return role === "admin" || subscriptionStatus === "pro"
}

/** API: 401/403 oder null wenn Zugriff ok. */
export async function requireProDecksAccess(
  email: string | undefined | null
): Promise<NextResponse | null> {
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, subscriptionStatus: true },
  })
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!canUsePersonalDecks(user.role, user.subscriptionStatus)) {
    return NextResponse.json(
      {
        error: "pro_required",
        message: "Eigene Prüfungsdecks sind ein Pro-Feature.",
      },
      { status: 403 }
    )
  }
  return null
}
