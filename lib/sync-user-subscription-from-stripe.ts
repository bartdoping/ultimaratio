/**
 * Liest die aktuelle Subscription bei Stripe und schreibt Perioden/Status in die DB.
 * Nur für echte Stripe-Subscription-IDs (sub_…), nicht für simulierte Test-Einträge.
 */
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { stripeSubscriptionGrantsPro } from "@/lib/stripe-subscription-access"
import { getStripeSubscriptionPeriodBounds } from "@/lib/stripe-subscription-period"

export async function syncUserSubscriptionFromStripe(userId: string): Promise<boolean> {
  const row = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeSubscriptionId: true },
  })
  const sid = row?.stripeSubscriptionId
  if (!sid || !sid.startsWith("sub_")) {
    return false
  }

  try {
    const sub = await stripe.subscriptions.retrieve(sid)
    const grantsPro = stripeSubscriptionGrantsPro(sub.status)
    const customerId =
      typeof sub.customer === "string" ? sub.customer : (sub.customer as { id?: string })?.id
    const bounds = getStripeSubscriptionPeriodBounds(sub)

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: grantsPro ? "pro" : "free",
        stripeCustomerId: customerId ?? undefined,
        currentPeriodStart: bounds.start,
        currentPeriodEnd: bounds.end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: grantsPro ? "pro" : "free",
      },
    })

    return true
  } catch (e) {
    console.error("[syncUserSubscriptionFromStripe]", e)
    return false
  }
}
