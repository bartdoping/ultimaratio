// app/api/stripe/subscription/reactivate/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { getStripeSubscriptionPeriodBounds } from "@/lib/stripe-subscription-period"

export const runtime = "nodejs";

export async function POST() {
  try {
    // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2) User + Subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            status: true,
            cancelAtPeriodEnd: true
          }
        }
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    console.log("Reactivation request for user:", { 
      userId: user.id, 
      subscriptionStatus: user.subscriptionStatus,
      hasStripeSubscription: !!user.subscription?.stripeSubscriptionId,
      cancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd
    });

    // Prüfe ob User Pro-Status hat
    if (user.subscriptionStatus !== "pro") {
      return NextResponse.json({ 
        ok: false, 
        error: "Du hast kein Pro-Abonnement zum Reaktivieren." 
      }, { status: 400 });
    }

    // Prüfe ob Abonnement gekündigt ist
    if (!user.subscription?.cancelAtPeriodEnd) {
      return NextResponse.json({ 
        ok: false, 
        error: "Dein Abonnement ist nicht gekündigt." 
      }, { status: 400 });
    }

    if (!user.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Reaktivierung nicht möglich für diesen Account-Typ.",
        },
        { status: 400 }
      )
    }

    const stripeSubId = user.subscription.stripeSubscriptionId

    if (stripeSubId.startsWith("simulated_")) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { cancelAtPeriodEnd: false },
      })
      return NextResponse.json({ ok: true, message: "subscription_reactivated" })
    }

    let updated: Awaited<ReturnType<typeof stripe.subscriptions.update>>
    try {
      updated = await stripe.subscriptions.update(stripeSubId, {
        cancel_at_period_end: false,
      })
    } catch (stripeError: unknown) {
      console.error("Stripe reactivation error:", stripeError)
      const msg =
        stripeError instanceof Error ? stripeError.message : "Stripe-Fehler"
      return NextResponse.json(
        { ok: false, error: `Reaktivierung fehlgeschlagen: ${msg}` },
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

    return NextResponse.json({ ok: true, message: "subscription_reactivated" })
  } catch (err: any) {
    console.error("subscription reactivation error", err);
    return NextResponse.json({ 
      ok: false, 
      error: `Reaktivierung fehlgeschlagen: ${err.message || "Unbekannter Fehler"}` 
    }, { status: 500 });
  }
}
