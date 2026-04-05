// app/api/stripe/subscription/cancel/route.ts
// Kündigung zum Ende der laufenden Abrechnungsperiode (Stripe: cancel_at_period_end).
// Pro bleibt bis current_period_end aktiv — wie bei SaaS-Standards.
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { getStripeSubscriptionPeriodBounds } from "@/lib/stripe-subscription-period"

export const runtime = "nodejs"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            status: true,
          },
        },
      },
    })
    if (!user) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 })
    }

    if (user.subscriptionStatus !== "pro") {
      return NextResponse.json(
        {
          ok: false,
          error: "Du hast kein aktives Pro-Abonnement zum Kündigen.",
        },
        { status: 400 }
      )
    }

    if (!user.subscription?.stripeSubscriptionId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "free" },
      })
      return NextResponse.json({ ok: true, message: "subscription_cancelled_no_stripe" })
    }

    const stripeSubId = user.subscription.stripeSubscriptionId

    if (stripeSubId.startsWith("simulated_")) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { cancelAtPeriodEnd: true },
      })
      return NextResponse.json({ ok: true, message: "subscription_cancelled" })
    }

    let updated: Awaited<ReturnType<typeof stripe.subscriptions.update>>
    try {
      updated = await stripe.subscriptions.update(stripeSubId, {
        cancel_at_period_end: true,
      })
    } catch (stripeError: unknown) {
      const msg =
        stripeError instanceof Error ? stripeError.message : "Stripe-Fehler"
      console.error("Stripe cancellation error:", stripeError)
      return NextResponse.json(
        { ok: false, error: "stripe_failed", details: msg },
        { status: 502 }
      )
    }

    let bounds
    try {
      bounds = getStripeSubscriptionPeriodBounds(updated)
    } catch {
      const full = await stripe.subscriptions.retrieve(stripeSubId)
      bounds = getStripeSubscriptionPeriodBounds(full)
    }

    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        currentPeriodStart: bounds.start,
        currentPeriodEnd: bounds.end,
        status: "pro",
      },
    })

    return NextResponse.json({
      ok: true,
      message: "subscription_cancelled",
      currentPeriodEnd: bounds.end.toISOString(),
    })
  } catch (err: unknown) {
    console.error("subscription cancel error", err)
    return NextResponse.json(
      {
        ok: false,
        error: `Kündigung fehlgeschlagen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`,
      },
      { status: 500 }
    )
  }
}
