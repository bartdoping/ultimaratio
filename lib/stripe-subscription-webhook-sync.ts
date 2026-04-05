/**
 * Webhook: User anhand Stripe-Subscription auflösen und DB synchronisieren.
 * Wichtig: metadata.userId fehlt bei vielen customer.subscription.* Events → Fallback über DB.
 */
import type Stripe from "stripe"
import prisma from "@/lib/db"
import { stripeSubscriptionGrantsPro } from "@/lib/stripe-subscription-access"
import { getStripeSubscriptionPeriodBounds } from "@/lib/stripe-subscription-period"

export async function resolveUserIdForStripeSubscription(
  sub: Stripe.Subscription
): Promise<string | null> {
  const meta = sub.metadata?.userId
  if (meta && typeof meta === "string") {
    return meta
  }

  const bySub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: sub.id },
    select: { userId: true },
  })
  if (bySub) return bySub.userId

  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : (sub.customer as { id?: string } | null)?.id
  if (customerId) {
    const byCust = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    })
    if (byCust) return byCust.userId
  }

  return null
}

/** Schreibt Perioden, Kündigungsende und Pro/Free aus Stripe-Subscription. */
export async function applyStripeSubscriptionToDatabase(
  sub: Stripe.Subscription
): Promise<void> {
  const userId = await resolveUserIdForStripeSubscription(sub)
  if (!userId) {
    console.warn(
      "[applyStripeSubscriptionToDatabase] Kein User für Subscription",
      sub.id
    )
    return
  }

  const grantsPro = stripeSubscriptionGrantsPro(sub.status)
  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : (sub.customer as { id?: string } | null)?.id

  let period: { start: Date; end: Date } | null = null
  try {
    period = getStripeSubscriptionPeriodBounds(sub)
  } catch (e) {
    console.warn("[applyStripeSubscriptionToDatabase] period bounds:", e)
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId ?? undefined,
      status: grantsPro ? "pro" : "free",
      currentPeriodStart: period?.start ?? new Date(),
      currentPeriodEnd: period?.end ?? new Date(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      createdAt: new Date(),
    },
    update: {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId ?? undefined,
      status: grantsPro ? "pro" : "free",
      ...(period
        ? {
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
          }
        : {}),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: grantsPro ? "pro" : "free" },
  })
}
