// app/api/stripe/subscription/simulate-cancel/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST() {
  try {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_SIMULATED_SUBSCRIPTION !== "true"
    ) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
    }

    // 1) Auth
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    // 2) User + Subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        email: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            status: true
          }
        }
      },
    })
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 })

    // Nur für simulierte Abonnements (Test-User/Admins)
    if (user.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ 
        ok: false, 
        error: "Echtes Abonnement kann nicht simuliert gekündigt werden" 
      }, { status: 400 })
    }

    // Simuliere Kündigung durch Erstellen einer Subscription mit cancelAtPeriodEnd = true
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId: `simulated_${user.id}`,
        stripeSubscriptionId: `simulated_${user.id}_${Date.now()}`,
        status: "pro",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // +30 Tage
        cancelAtPeriodEnd: true, // Gekündigt
        createdAt: new Date()
      },
      update: {
        cancelAtPeriodEnd: true, // Als gekündigt markieren
      }
    })

    return NextResponse.json({
      ok: true,
      message: "Abonnement simuliert gekündigt",
      simulated: true
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.slice(0, 200) : "Unbekannter Fehler"
    console.error("simulate cancel error", { message: msg })
    return NextResponse.json({
      ok: false,
      error: `Simulation fehlgeschlagen: ${msg}`
    }, { status: 500 })
  }
}
