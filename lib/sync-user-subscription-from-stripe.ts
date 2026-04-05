/**
 * Liest die aktuelle Subscription bei Stripe und schreibt Perioden/Status in die DB.
 * Nur für echte Stripe-Subscription-IDs (sub_…), nicht für simulierte Test-Einträge.
 */
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"

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
    const isPro = sub.status === "active" || sub.status === "trialing"
    const customerId =
      typeof sub.customer === "string" ? sub.customer : (sub.customer as { id?: string })?.id

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: isPro ? "pro" : "free",
        stripeCustomerId: customerId ?? undefined,
        currentPeriodStart: new Date((sub as any).current_period_start * 1000),
        currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
        cancelAtPeriodEnd: (sub as any).cancel_at_period_end,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: isPro ? "pro" : "free",
      },
    })

    return true
  } catch (e) {
    console.error("[syncUserSubscriptionFromStripe]", e)
    return false
  }
}
