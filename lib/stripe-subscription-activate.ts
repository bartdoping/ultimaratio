/**
 * Pro-Status aus einer abgeschlossenen Stripe Checkout Session (mode=subscription).
 * Wird vom Webhook und vom Return-Fallback (complete-checkout) genutzt.
 */
import type Stripe from "stripe"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { getStripeSubscriptionPeriodBounds } from "@/lib/stripe-subscription-period"
import { notifyAdminNewProSubscription } from "@/lib/admin-notify"

function isPaidLikeCheckoutSession(s: Stripe.Checkout.Session): boolean {
  return (
    s.payment_status === "paid" ||
    s.payment_status === "no_payment_required"
  )
}

export async function activateProFromCheckoutSession(
  s: Stripe.Checkout.Session
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (s.mode !== "subscription") {
    return { ok: false, reason: "not_subscription_mode" }
  }

  const userId = s.metadata?.userId
  if (!userId || typeof userId !== "string") {
    return { ok: false, reason: "missing_user_id_metadata" }
  }

  let shouldUpgrade = isPaidLikeCheckoutSession(s)

  if (!shouldUpgrade && s.subscription) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        s.subscription as string
      )
      shouldUpgrade =
        stripeSubscription.status === "active" ||
        stripeSubscription.status === "trialing"
    } catch (e) {
      console.error("[activateProFromCheckoutSession] retrieve subscription:", e)
      return { ok: false, reason: "stripe_subscription_retrieve_failed" }
    }
  }

  if (!shouldUpgrade) {
    return {
      ok: false,
      reason: `payment_not_complete:${s.payment_status ?? "unknown"}`,
    }
  }

  // Vorherigen Status laden, damit Admin-Benachrichtigung nur beim
  // Übergang free → pro feuert (Schutz vor Doppelversand bei Webhook +
  // complete-checkout-Redirect-Fallback).
  const prevUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, subscriptionStatus: true },
  })
  const wasPro = prevUser?.subscriptionStatus === "pro"

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: "pro" },
  })

  if (s.subscription) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        s.subscription as string
      )
      const bounds = getStripeSubscriptionPeriodBounds(stripeSubscription)
      const custRaw =
        typeof stripeSubscription.customer === "string"
          ? stripeSubscription.customer
          : (stripeSubscription.customer as { id?: string })?.id
      const cust = custRaw || undefined
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: cust,
          status: "pro",
          currentPeriodStart: bounds.start,
          currentPeriodEnd: bounds.end,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          createdAt: new Date(),
        },
        update: {
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: cust,
          status: "pro",
          currentPeriodStart: bounds.start,
          currentPeriodEnd: bounds.end,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      })
    } catch (e) {
      console.error(
        "[activateProFromCheckoutSession] subscription table upsert:",
        e
      )
    }
  }

  // Admin-Benachrichtigung — best-effort, blockt nicht.
  if (!wasPro && prevUser?.email) {
    let periodEnd: Date | null = null
    let stripeSubId: string | null = null
    if (s.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(s.subscription as string)
        stripeSubId = sub.id
        periodEnd = getStripeSubscriptionPeriodBounds(sub).end
      } catch {
        // ignore — Notification trotzdem schicken, ohne Period.
      }
    }
    void notifyAdminNewProSubscription({
      email: prevUser.email,
      stripeSubscriptionId: stripeSubId,
      currentPeriodEnd: periodEnd,
      source: "checkout.session.completed",
    })
  }

  return { ok: true }
}
