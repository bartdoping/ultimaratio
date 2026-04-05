// app/api/stripe/subscription/status/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { syncUserSubscriptionFromStripe } from "@/lib/sync-user-subscription-from-stripe"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      )
    }

    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    })
    if (!user) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 })
    }

    const stripeSubId = user.subscription?.stripeSubscriptionId
    const needsStripeSync =
      typeof stripeSubId === "string" &&
      stripeSubId.startsWith("sub_") &&
      (!user.subscription?.currentPeriodEnd || !user.subscription?.currentPeriodStart)

    if (needsStripeSync) {
      await syncUserSubscriptionFromStripe(user.id)
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          subscriptionStatus: true,
          subscription: {
            select: {
              stripeSubscriptionId: true,
              status: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      })
      if (!user) {
        return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 })
      }
    }

    const now = new Date()
    const isPro = user.subscriptionStatus === "pro"
    const questionsRemaining = isPro ? -1 : 0
    const dailyQuestionsUsed = 0

    let daysRemaining: number | null = null
    if (user.subscription?.cancelAtPeriodEnd && user.subscription?.currentPeriodEnd) {
      const periodEnd = new Date(user.subscription.currentPeriodEnd)
      const diffTime = periodEnd.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    const isSimulated =
      typeof user.subscription?.stripeSubscriptionId === "string" &&
      user.subscription.stripeSubscriptionId.startsWith("simulated_")

    let simulatedNextPayment: Date | null = null
    let simulatedPeriodStart: Date | null = null
    let simulatedCancelAtPeriodEnd = false

    if (user.subscriptionStatus === "pro" && isSimulated && user.subscription) {
      simulatedNextPayment = user.subscription.currentPeriodEnd
      simulatedPeriodStart = user.subscription.currentPeriodStart
      simulatedCancelAtPeriodEnd = user.subscription.cancelAtPeriodEnd
      if (user.subscription.cancelAtPeriodEnd && user.subscription.currentPeriodEnd) {
        const periodEnd = new Date(user.subscription.currentPeriodEnd)
        const diffTime = periodEnd.getTime() - now.getTime()
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }
    }

    return NextResponse.json(
      {
        ok: true,
        subscription: {
          status: user.subscriptionStatus,
          isPro,
          questionsRemaining,
          dailyQuestionsUsed,
          subscriptionDetails: user.subscription,
          nextPaymentDate:
            user.subscription?.currentPeriodEnd || simulatedNextPayment,
          cancelAtPeriodEnd:
            user.subscription?.cancelAtPeriodEnd ?? simulatedCancelAtPeriodEnd,
          periodStart: user.subscription?.currentPeriodStart || simulatedPeriodStart,
          periodEnd: user.subscription?.currentPeriodEnd || simulatedNextPayment,
          daysRemaining,
          isSimulated,
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    )
  } catch (err: unknown) {
    console.error("subscription status error", err)
    return NextResponse.json({ ok: false, error: "status failed" }, { status: 500 })
  }
}
