// app/api/stripe/subscription/checkout/route.ts
import { NextResponse } from "next/server"
import { track } from "@/lib/product-events"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { getAppBaseUrl } from "@/lib/app-base-url"
import { formatAmount, getPlanOffers, isPlanId, istPass, passTage, PLAN_NAME, priceIdFor } from "@/lib/stripe-plans"
import {
  assertStripeReadyForCharges,
  getStripeConfig,
  StripeConfigError,
} from "@/lib/stripe-config"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    // 0) Konfiguration validieren — in Production hart, in Dev mit klarer
    // Fehlermeldung. Wir wollen niemals einen Live-Checkout ohne sk_live_-Key
    // oder ohne konfigurierte Live-Price-ID öffnen.
    let cfg
    try {
      // Der Monatspreis wird erst geprüft, wenn das Monatsabo gewählt ist —
      // Pässe sollen auch ohne ihn kaufbar sein.
      cfg = assertStripeReadyForCharges({ requireMonthly: false })
    } catch (err) {
      if (err instanceof StripeConfigError) {
        const inProd = getStripeConfig().isProduction
        return NextResponse.json(
          {
            ok: false,
            error: "stripe_misconfigured",
            details: inProd
              ? "Stripe ist in Production nicht konfiguriert. Setze STRIPE_PRICE_ID_PRO_MONTHLY und einen Live-Webhook."
              : err.message,
          },
          { status: 500 }
        )
      }
      throw err
    }

    // 1) Auth
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    // 2) User
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        proBonusUntil: true,
        proTrialEndsAt: true,
        subscription: {
          select: {
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            status: true,
          },
        },
      },
    })
    if (!user) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 })
    }

    if (user.subscriptionStatus === "pro") {
      return NextResponse.json({ ok: false, error: "already_pro" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const plan = isPlanId(body?.plan) ? body.plan : "pro_monthly"
    const priceId = plan === "pro_monthly" ? cfg.proMonthlyPriceId : priceIdFor(plan)
    if (!priceId) {
      return NextResponse.json({ ok: false, error: "plan_unavailable" }, { status: 400 })
    }
    // Kein Doppelbezahlen (AGB § 5 Abs. 3): Während ein Pass oder Bonuszeit
    // läuft, kein Monatsabo — das Abo würde parallel abgebucht.
    if (!istPass(plan) && user.proBonusUntil && user.proBonusUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { ok: false, error: "pass_active", bis: user.proBonusUntil.toISOString() },
        { status: 400 }
      )
    }
    // Nur bekannte Ziele — keine frei wählbare Weiterleitung (Open Redirect).
    const returnTo =
      body?.returnTo === "/generator" || body?.returnTo === "/kreuzen" ? body.returnTo : "/kreuzen"

    // 3) Stripe Customer erstellen oder finden. E-Mail nur an Stripe geben —
    // KEINE Logs mit E-Mail oder PII.
    let customerId = user.subscription?.stripeCustomerId

    // Wenn eine alte Customer-ID in der DB liegt: prüfen, ob sie im aktuellen
    // Stripe-Account überhaupt noch existiert. Bei Test-Mode-Reset oder
    // Account-Wechsel ist das oft nicht mehr der Fall — wir behandeln das
    // wie „kein Customer vorhanden" und legen einen neuen an.
    if (customerId && !customerId.startsWith("simulated_")) {
      try {
        const existing = await stripe.customers.retrieve(customerId)
        // Stripe markiert gelöschte Customer mit `deleted: true`.
        if ((existing as { deleted?: boolean }).deleted) {
          customerId = undefined
        }
      } catch (err) {
        const stripeErr = err as { code?: string; statusCode?: number; type?: string }
        if (
          stripeErr?.code === "resource_missing" ||
          stripeErr?.statusCode === 404 ||
          stripeErr?.type === "StripeInvalidRequestError"
        ) {
          customerId = undefined
        } else {
          throw err
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      customerId = customer.id

      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeCustomerId: customerId,
          status: "free",
          createdAt: new Date(),
        },
        update: {
          stripeCustomerId: customerId,
          // Falls dort noch eine alte stripeSubscriptionId stand, die zum alten
          // Customer gehörte: zurücksetzen, sonst zeigt sie ins Nichts.
          stripeSubscriptionId: null,
        },
      })
    }

    // 4) Checkout Session — ausschließlich mit Dashboard-konfigurierter Price ID,
    // KEIN dynamischer price_data-Fallback mehr (würde Preis im Code erlauben).
    const base = getAppBaseUrl()
    const gemeinsam = {
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${returnTo}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${returnTo}?subscription=cancelled`,
      allow_promotion_codes: true,
      // Deutsche Oberfläche — die Bestell-Schaltfläche muss auf Deutsch auf die
      // Zahlungspflicht hinweisen (§ 312j Abs. 3 BGB).
      locale: "de" as const,
      metadata: { userId: user.id, plan },
    }
    const pass = istPass(plan)
    const testphaseBis =
      user.proTrialEndsAt && user.proTrialEndsAt.getTime() > Date.now() + 48 * 3600 * 1000 ? user.proTrialEndsAt : null
    const angebot = (await getPlanOffers().catch(() => [])).find((o) => o.plan === "pro_monthly")
    const monatspreis = angebot?.amountCents ? formatAmount(angebot.amountCents, angebot.currency) : null
    const checkoutSession = pass
      ? // Pässe: Einmalzahlung mit fester Laufzeit — kein Abo, nichts zu kündigen.
        await stripe.checkout.sessions.create({
          ...gemeinsam,
          mode: "payment",
          submit_type: "pay",
          payment_intent_data: { metadata: { userId: user.id, plan, days: String(passTage(plan)) } },
          // Rechnung auch für Einmalzahlungen (AGB § 4 Abs. 6).
          invoice_creation: {
            enabled: true,
            invoice_data: {
              description: `${PLAN_NAME[plan]} — Pro-Zugang auf fragenkreuzen.de`,
              footer: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
            },
          },
          custom_text: {
            submit: {
              message: `Mit Klick auf „Bezahlen“ kaufst du zahlungspflichtig den ${PLAN_NAME[plan]}. Einmalige Zahlung, keine Verlängerung. 14 Tage Widerrufsrecht mit voller Erstattung.`,
            },
          },
        })
      : await stripe.checkout.sessions.create({
          ...gemeinsam,
          mode: "subscription",
          subscription_data: {
            metadata: { userId: user.id, plan },
            // In der Testphase abgeschlossen: erste Abbuchung erst zum Testphasen-
            // Ende. Stripe verlangt dafür mindestens 48 h Vorlauf, sonst sofort.
            ...(testphaseBis ? { trial_end: Math.floor(testphaseBis.getTime() / 1000) } : {}),
          },
          custom_text: {
            submit: {
              message: `Mit Klick auf „Abonnieren“ schließt du ein zahlungspflichtiges Abo${monatspreis ? ` über ${monatspreis} pro Monat` : ""} ab.${testphaseBis ? ` Die erste Abbuchung erfolgt erst am ${testphaseBis.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}, wenn deine Testphase endet.` : ""} Monatlich kündbar, 14 Tage Widerrufsrecht mit voller Erstattung.`,
            },
          },
        })

    track("checkout_started", { userId: user.id, props: { plan } })
    return NextResponse.json({ ok: true, url: checkoutSession.url })
  } catch (err: unknown) {
    const e = err as { type?: string; message?: string }
    const errorType = typeof e?.type === "string" ? e.type : "unknown"
    const shortMessage =
      typeof e?.message === "string" ? e.message.slice(0, 200) : "Unbekannter Fehler"
    console.error("subscription checkout error", { type: errorType, message: shortMessage })
    return NextResponse.json(
      {
        ok: false,
        error: "checkout failed",
        details: shortMessage,
        type: errorType,
      },
      { status: 500 }
    )
  }
}
