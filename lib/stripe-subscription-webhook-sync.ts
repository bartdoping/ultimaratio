/**
 * Webhook: User anhand Stripe-Subscription auflösen und DB synchronisieren.
 * Wichtig: metadata.userId fehlt bei vielen customer.subscription.* Events → Fallback über DB.
 */
import type Stripe from "stripe"
import prisma from "@/lib/db"
import { stripeSubscriptionGrantsPro } from "@/lib/stripe-subscription-access"
import { getStripeSubscriptionPeriodBounds } from "@/lib/stripe-subscription-period"
import { notifyAdminNewProSubscription } from "@/lib/admin-notify"

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

/**
 * Schreibt Perioden, Kündigungsende und Pro/Free aus Stripe-Subscription.
 * Sendet eine Admin-Benachrichtigung, falls sich der User-Status durch dieses
 * Event von "nicht-pro" → "pro" ändert (Transition-Detection). So wird auch
 * bei mehrfachen Events pro Subscription nur einmal benachrichtigt.
 *
 * Optionaler `source`-Parameter wird in der Benachrichtigung als Trigger
 * angezeigt (z. B. der konkrete Stripe-Event-Type).
 */
export async function applyStripeSubscriptionToDatabase(
  sub: Stripe.Subscription,
  options?: { source?: string }
): Promise<void> {
  const userId = await resolveUserIdForStripeSubscription(sub)
  if (!userId) {
    console.warn("[applyStripeSubscriptionToDatabase] Kein User für Subscription", {
      subscriptionId: sub.id,
    })
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

  // Vor dem Schreiben den aktuellen User-Status auslesen, um die Transition
  // free → pro zuverlässig erkennen zu können.
  const prevUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, subscriptionStatus: true },
  })
  const wasPro = prevUser?.subscriptionStatus === "pro"

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

  // Admin-Benachrichtigung nur beim echten Übergang nicht-pro → pro.
  // Best-effort, blockiert den Webhook nicht.
  if (!wasPro && grantsPro && prevUser?.email) {
    void notifyAdminNewProSubscription({
      email: prevUser.email,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: period?.end ?? null,
      source: options?.source ?? "stripe.webhook",
    })
  }
}
