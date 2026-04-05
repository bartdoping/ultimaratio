/**
 * Einheitliche Regeln: Wann hat ein Nutzer noch Pro-Zugang?
 * Entspricht üblichem SaaS: active / trialing / past_due = weiterhin Zugang
 * (past_due = Stripe versucht noch Zahlung einzuziehen).
 */
export function stripeSubscriptionGrantsPro(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due"
}
