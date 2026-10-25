import stripe from "@/lib/stripe"
import { getStripeConfig } from "@/lib/stripe-config"

/**
 * Tarife, die tatsächlich buchbar sind — mit Beträgen direkt aus Stripe.
 *
 * Jahresabo und Examenspass erscheinen nur, wenn ihre Preis-ID gesetzt ist.
 * Die Beträge stehen bewusst nicht im Code: Was Stripe abbucht, ist das,
 * was angezeigt wird.
 */

export type PlanId = "pro_monthly" | "exam_pass" | "year_pass"

export type PlanOffer = {
  plan: PlanId
  priceId: string
  amountCents: number | null
  currency: string
  /** "month" | "year" bei Abos, null bei Einmalzahlung. */
  interval: "month" | "year" | null
}

/** Pässe: so lange gilt Pro nach der Einmalzahlung (keine Verlängerung). */
export const EXAM_PASS_DAYS = 90
export const YEAR_PASS_DAYS = 365

export const PLAN_IDS: readonly PlanId[] = ["pro_monthly", "exam_pass", "year_pass"]

/** Einmalzahlung mit fester Laufzeit statt Abo. */
export function istPass(plan: PlanId): plan is "exam_pass" | "year_pass" {
  return plan === "exam_pass" || plan === "year_pass"
}

export function passTage(plan: "exam_pass" | "year_pass"): number {
  return plan === "exam_pass" ? EXAM_PASS_DAYS : YEAR_PASS_DAYS
}

export const PLAN_NAME: Record<PlanId, string> = {
  pro_monthly: "Pro-Monatsabo",
  exam_pass: "Examenspass (90 Tage)",
  year_pass: "Jahrespass (12 Monate)",
}

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && (PLAN_IDS as readonly string[]).includes(v)
}

export function priceIdFor(plan: PlanId): string | null {
  const cfg = getStripeConfig()
  return plan === "pro_monthly" ? cfg.proMonthlyPriceId : plan === "year_pass" ? cfg.yearPassPriceId : cfg.examPassPriceId
}

let cache: { at: number; offers: PlanOffer[] } | null = null
const TTL_MS = 60 * 60 * 1000

export async function getPlanOffers(): Promise<PlanOffer[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.offers
  const offers: PlanOffer[] = []
  for (const plan of PLAN_IDS) {
    const priceId = priceIdFor(plan)
    if (!priceId) continue
    try {
      const p = await stripe.prices.retrieve(priceId)
      offers.push({
        plan,
        priceId,
        amountCents: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval === "year" ? "year" : p.recurring?.interval === "month" ? "month" : null,
      })
    } catch {
      // Preis nicht abrufbar → Tarif nicht anbieten (Monatsabo trotzdem ohne Betrag).
      if (plan === "pro_monthly") offers.push({ plan, priceId, amountCents: null, currency: "eur", interval: "month" })
    }
  }
  cache = { at: Date.now(), offers }
  return offers
}

export function formatAmount(cents: number | null, currency = "eur"): string {
  if (cents === null) return ""
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100)
}

/** Ersparnis des Jahrespasses gegenüber 12 Monaten Monatsabo, in ganzen Prozent. */
export function yearlySavingPercent(monthlyCents: number | null, yearlyCents: number | null): number | null {
  if (!monthlyCents || !yearlyCents) return null
  const p = Math.round((1 - yearlyCents / (monthlyCents * 12)) * 100)
  return p > 0 ? p : null
}

/**
 * Aufbereitung für die Oberfläche (serialisierbar). Reihenfolge: Monatsabo,
 * Examenspass, Jahrespass.
 */
export async function planChoices(): Promise<
  { plan: PlanId; price: string; suffix: string; hint?: string }[]
> {
  const offers = await getPlanOffers().catch(() => [] as PlanOffer[])
  const monat = offers.find((o) => o.plan === "pro_monthly")
  const pass = offers.find((o) => o.plan === "exam_pass")
  const jahr = offers.find((o) => o.plan === "year_pass")
  const out: { plan: PlanId; price: string; suffix: string; hint?: string }[] = []
  if (monat) out.push({ plan: "pro_monthly", price: formatAmount(monat.amountCents, monat.currency), suffix: "/ Monat", hint: "monatlich kündbar" })
  if (pass) out.push({ plan: "exam_pass", price: formatAmount(pass.amountCents, pass.currency), suffix: `einmalig · ${EXAM_PASS_DAYS} Tage`, hint: "kein Abo" })
  if (jahr) {
    const spar = yearlySavingPercent(monat?.amountCents ?? null, jahr.amountCents)
    out.push({ plan: "year_pass", price: formatAmount(jahr.amountCents, jahr.currency), suffix: "einmalig · 12 Monate", hint: spar ? `${spar} % gespart` : "kein Abo" })
  }
  return out
}
