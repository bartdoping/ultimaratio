// app/api/stripe/webhook/route.ts
//
// Verifiziert Stripe-Webhook-Signatur und verarbeitet relevante Events
// idempotent. Vor jeder Verarbeitung wird die `event.id` in `StripeEventLog`
// geprüft — bereits gesehene Events werden mit 200 quittiert, ohne erneut
// die DB zu ändern.
import { NextResponse } from "next/server"
import { extendBonus, passBeginn } from "@/lib/subscription"
import { isPlanId, istPass, passTage, type PlanId } from "@/lib/stripe-plans"
import { sendeVertragsbestaetigung } from "@/lib/vertragsbestaetigung"
import { track } from "@/lib/product-events"
import type Stripe from "stripe"
import stripe from "@/lib/stripe"
import prisma from "@/lib/db"
import { activateProFromCheckoutSession } from "@/lib/stripe-subscription-activate"
import {
  applyStripeSubscriptionToDatabase,
  resolveUserIdForStripeSubscription,
} from "@/lib/stripe-subscription-webhook-sync"

export const runtime = "nodejs"

/**
 * Idempotenz-Reservierung. Drei Outcomes:
 *  - "fresh"      → erste Annahme, wir verarbeiten und markieren am Ende.
 *  - "processed"  → Event wurde bereits erfolgreich verarbeitet → 200.
 *  - "in_flight"  → Reservierung existiert, aber processedAt fehlt. Wir
 *                   behandeln das wie ein Retry und verarbeiten erneut;
 *                   am Ende markieren wir processedAt. So bleiben Stripe-
 *                   Retries nach abgebrochenen Handler-Läufen funktionsfähig.
 */
type Reservation = "fresh" | "processed" | "in_flight"

async function reserveEvent(event: Stripe.Event): Promise<Reservation> {
  try {
    await prisma.stripeEventLog.create({
      data: {
        eventId: event.id,
        type: event.type,
        livemode: event.livemode,
      },
    })
    return "fresh"
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      const existing = await prisma.stripeEventLog.findUnique({
        where: { eventId: event.id },
        select: { processedAt: true },
      })
      return existing?.processedAt ? "processed" : "in_flight"
    }
    throw err
  }
}

async function markProcessed(eventId: string): Promise<void> {
  await prisma.stripeEventLog
    .update({ where: { eventId }, data: { processedAt: new Date() } })
    .catch(() => {
      // Best-effort: Idempotenz ist über `eventId @unique` bereits gesichert.
    })
}

/**
 * Liefert die Subscription-ID aus einem Invoice-Event.
 * Stripe SDK v18 hat das frühere `invoice.subscription`-Feld in
 * `invoice.parent.subscription_details.subscription` verschoben.
 * Fallback auf den alten Pfad, falls in Übergangszeit gemischte Events
 * auftreten.
 */
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent =
    invoice.parent?.subscription_details?.subscription ?? null
  if (typeof fromParent === "string") return fromParent
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return (fromParent as { id: string }).id
  }
  // Legacy-Pfad (vor SDK v18) — defensiv lesen.
  const legacy = (invoice as unknown as { subscription?: string }).subscription
  return typeof legacy === "string" ? legacy : null
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) return new NextResponse("Missing webhook secret", { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    const msg = (err as Error)?.message?.slice(0, 120)
    console.warn("webhook signature invalid", { message: msg })
    return new NextResponse("Webhook signature verification failed", { status: 400 })
  }

  // Idempotenz: bereits final verarbeitete Events sofort mit 200 quittieren.
  const reservation = await reserveEvent(event)
  if (reservation === "processed") {
    return NextResponse.json({ received: true, duplicate: true })
  }
  // "fresh" oder "in_flight" → durchlaufen (in_flight bedeutet vorheriger
  // Versuch hat processedAt nicht erreicht — Stripe-Retry darf das fortsetzen).

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session
        const userId = (s.metadata?.userId as string | undefined) || undefined
        const examId = (s.metadata?.examId as string | undefined) || undefined

        if (s.mode === "subscription" && userId) {
          const result = await activateProFromCheckoutSession(s)
          if (!result.ok) {
            console.warn("checkout.session.completed nicht aktiviert", {
              eventId: event.id,
              reason: result.reason,
              payment_status: s.payment_status,
            })
          }
        }

        const plan: PlanId = isPlanId(s.metadata?.plan) ? s.metadata.plan : "pro_monthly"
        let passEnde: Date | null = null
        if (userId && s.mode === "payment" && istPass(plan) && s.payment_status === "paid") {
          passEnde = await grantPass(userId, plan, s.id)
        }
        // Vertragsbestätigung mit AGB (§ 312f BGB) — darf den Webhook nie scheitern lassen.
        if (userId && (s.mode === "subscription" || istPass(plan))) {
          try {
            const an =
              s.customer_details?.email ??
              (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email
            // Abo mit Startverzögerung (abgeschlossen in der Testphase): erste Abbuchung nennen.
            let abrechnungAb: Date | null = null
            let aboPreis: number | null = null
            if (s.mode === "subscription" && typeof s.subscription === "string") {
              const sub = await stripe.subscriptions.retrieve(s.subscription).catch(() => null)
              if (sub?.trial_end) abrechnungAb = new Date(sub.trial_end * 1000)
              aboPreis = sub?.items.data[0]?.price?.unit_amount ?? null
            }
            if (an) {
              await sendeVertragsbestaetigung(an, {
                plan,
                // Bei Startverzögerung ist amount_total 0 — maßgeblich ist der Preis des Abos.
                betragCents: abrechnungAb ? aboPreis : (s.amount_total ?? null),
                waehrung: s.currency ?? "eur",
                endetAm: passEnde,
                abrechnungAb,
              })
            }
          } catch (e) {
            console.error("[stripe-webhook] Vertragsbestätigung fehlgeschlagen", (e as Error)?.message?.slice(0, 200))
          }
        }

        if (userId && examId && s.mode === "payment") {
          if (s.payment_status === "paid") {
            const exists = await prisma.purchase.findFirst({ where: { userId, examId } })
            if (!exists) {
              await prisma.purchase.create({
                data: { userId, examId, stripeSessionId: s.id },
              })
            }
          }
        }
        break
      }

      case "charge.refunded": {
        // Widerruf eines Passes: volle Erstattung → Pass-Laufzeit wieder abziehen.
        // (Abos: in Stripe sofort kündigen → customer.subscription.deleted.)
        const ch = event.data.object as Stripe.Charge
        if (ch.refunded && typeof ch.payment_intent === "string") {
          const pi = await stripe.paymentIntents.retrieve(ch.payment_intent).catch(() => null)
          const userId = (pi?.metadata?.userId as string | undefined) || undefined
          const plan = pi?.metadata?.plan
          if (userId && isPlanId(plan) && istPass(plan)) await revokePass(userId, plan)
        }
        break
      }

      case "checkout.session.async_payment_succeeded": {
        // Verzögerte Zahlarten (z. B. SEPA): Pro erst nach Zahlungseingang.
        const s = event.data.object as Stripe.Checkout.Session
        const userId = (s.metadata?.userId as string | undefined) || undefined
        if (userId && isPlanId(s.metadata?.plan) && istPass(s.metadata.plan)) await grantPass(userId, s.metadata.plan, s.id)
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await applyStripeSubscriptionToDatabase(subscription, {
          source: event.type,
        })
        const subUserId = (subscription.metadata?.userId as string | undefined) || null
        if (event.type === "customer.subscription.created") {
          track("subscription_started", { userId: subUserId, props: { plan: String(subscription.metadata?.plan ?? "") } })
        } else if (event.type === "customer.subscription.deleted") {
          track("subscription_canceled", { userId: subUserId })
        }
        break
      }

      case "invoice.payment_succeeded": {
        // Eine erfolgreiche Rechnungsbuchung bedeutet: Subscription weiterhin
        // aktiv (oder wieder aktiv nach past_due). Status frisch von Stripe
        // holen, damit der lokale Stand korrekt wird.
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoiceSubscriptionId(invoice)
        if (subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId)
            await applyStripeSubscriptionToDatabase(sub, {
              source: "invoice.payment_succeeded",
            })
          } catch (err) {
            console.error("invoice.payment_succeeded apply failed", {
              eventId: event.id,
              message: (err as Error)?.message?.slice(0, 200),
            })
          }
        }
        break
      }

      case "invoice.payment_failed": {
        // Bei fehlgeschlagener Zahlung steht die Subscription i. d. R. auf
        // past_due oder unpaid. Wir spiegeln den aktuellen Status; die UI
        // entscheidet, ob Pro-Zugang noch gewährt wird (siehe
        // stripeSubscriptionGrantsPro: past_due gilt aktuell als Pro).
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoiceSubscriptionId(invoice)
        if (subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId)
            await applyStripeSubscriptionToDatabase(sub, {
              source: "invoice.payment_failed",
            })
            // Optional: User-Markierung für UI-Warnung
            const userId = await resolveUserIdForStripeSubscription(sub)
            if (userId) {
              console.warn("invoice.payment_failed", {
                eventId: event.id,
                userId,
                status: sub.status,
              })
            }
          } catch (err) {
            console.error("invoice.payment_failed apply failed", {
              eventId: event.id,
              message: (err as Error)?.message?.slice(0, 200),
            })
          }
        }
        break
      }

      default:
        // andere Events ignorieren wir bewusst.
        break
    }

    await markProcessed(event.id)
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error("Webhook handler failed", {
      eventId: event.id,
      eventType: event.type,
      message: (e as Error)?.message?.slice(0, 200),
    })
    // Wichtig: 500 zurückgeben, damit Stripe das Event erneut zustellt.
    // Idempotenz-Reservierung gilt — der Retry wird durch reserveEvent
    // bei erneuter Annahme erkannt; wir entfernen den Reservierungseintrag
    // bewusst NICHT, weil das Stripe-Retry-Verhalten die `event.id` stabil
    // hält. Bei dauerhaftem Fehler kann ein Admin den Log-Eintrag manuell
    // löschen, um einen Replay zu erzwingen.
    return new NextResponse("Webhook handler failed", { status: 500 })
  }
}

/** Pass gutschreiben: 90 Tage bzw. 12 Monate Pro, angehängt an laufende Pro-Zeit. Gibt das neue Ende zurück. */
async function grantPass(userId: string, plan: "exam_pass" | "year_pass", sessionId: string): Promise<Date | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { proBonusUntil: true, proTrialEndsAt: true } })
  if (!u) return null
  const ende = extendBonus(passBeginn(u.proBonusUntil, u.proTrialEndsAt), passTage(plan))
  await prisma.user.update({ where: { id: userId }, data: { proBonusUntil: ende } })
  track("subscription_started", { userId, props: { plan, session: sessionId.slice(-8) } })
  return ende
}

/** Pass nach vollständiger Erstattung zurücknehmen (nie unter "jetzt"). */
async function revokePass(userId: string, plan: "exam_pass" | "year_pass"): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { proBonusUntil: true } })
  if (!u?.proBonusUntil) return
  const jetzt = Date.now()
  const neu = Math.max(jetzt, u.proBonusUntil.getTime() - passTage(plan) * 86_400_000)
  await prisma.user.update({ where: { id: userId }, data: { proBonusUntil: neu <= jetzt ? null : new Date(neu) } })
  track("subscription_canceled", { userId, props: { plan, grund: "erstattung" } })
}
