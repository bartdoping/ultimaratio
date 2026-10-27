import stripe from "@/lib/stripe"

/** Stripe-Status, bei denen noch abgebucht wird oder werden kann. */
const LAUFEND = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"])

export function aboLaeuftNoch(status: string | null | undefined): boolean {
  return !!status && LAUFEND.has(status)
}

/**
 * Alle noch laufenden Stripe-Abos eines Kunden sofort beenden.
 *
 * Wird vor dem Löschen eines Kontos aufgerufen: Ohne Konto gibt es keine
 * Leistung mehr — Stripe darf dann nicht weiter abbuchen. Bewusst nicht
 * "zum Periodenende", denn danach existiert niemand mehr, der Pro nutzen
 * oder die Kündigung sehen könnte.
 *
 * Wirft bei Stripe-Fehlern, damit der Aufrufer das Konto NICHT löscht —
 * lieber ein Konto zu viel als ein Abo, das ins Leere weiterläuft.
 * Gibt die Zahl der beendeten Abos zurück.
 */
export async function beendeStripeAbos(ref: {
  stripeSubscriptionId?: string | null
  stripeCustomerId?: string | null
}): Promise<number> {
  const ids = new Set<string>()

  if (ref.stripeSubscriptionId) {
    const sub = await stripe.subscriptions.retrieve(ref.stripeSubscriptionId).catch((e: unknown) => {
      if ((e as { code?: string })?.code === "resource_missing") return null
      throw e
    })
    if (sub && aboLaeuftNoch(sub.status)) ids.add(sub.id)
  }

  if (ref.stripeCustomerId) {
    const liste = await stripe.subscriptions
      .list({ customer: ref.stripeCustomerId, status: "all", limit: 100 })
      .catch((e: unknown) => {
        if ((e as { code?: string })?.code === "resource_missing") return null
        throw e
      })
    for (const s of liste?.data ?? []) if (aboLaeuftNoch(s.status)) ids.add(s.id)
  }

  for (const id of ids) await stripe.subscriptions.cancel(id)
  return ids.size
}
