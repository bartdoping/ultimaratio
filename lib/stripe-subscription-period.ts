import type Stripe from "stripe"

/**
 * Laufzeit-Start/Ende aus Stripe Subscription (API liefert je nach Version
 * auf dem Root-Objekt oder auf dem ersten Subscription Item).
 */
export function getStripeSubscriptionPeriodBounds(sub: Stripe.Subscription): {
  start: Date
  end: Date
} {
  const root = sub as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }
  if (
    typeof root.current_period_start === "number" &&
    typeof root.current_period_end === "number"
  ) {
    return {
      start: new Date(root.current_period_start * 1000),
      end: new Date(root.current_period_end * 1000),
    }
  }
  const item = sub.items?.data?.[0]
  if (
    item &&
    typeof item.current_period_start === "number" &&
    typeof item.current_period_end === "number"
  ) {
    return {
      start: new Date(item.current_period_start * 1000),
      end: new Date(item.current_period_end * 1000),
    }
  }
  throw new Error("Stripe subscription: current period start/end missing")
}
