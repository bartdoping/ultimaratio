// app/api/stripe/subscription/checkout/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { getAppBaseUrl } from "@/lib/app-base-url"
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
      cfg = assertStripeReadyForCharges()
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
    const returnTo = body?.returnTo === "/generator" ? "/generator" : "/dashboard"

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
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: cfg.proMonthlyPriceId!, quantity: 1 }],
      success_url: `${base}${returnTo}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${returnTo}?subscription=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        plan: "pro_monthly",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: "pro_monthly",
        },
      },
    })

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
