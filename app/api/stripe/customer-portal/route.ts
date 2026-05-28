// app/api/stripe/customer-portal/route.ts
//
// Erstellt eine Stripe Billing-Portal-Session für eingeloggte Nutzer.
// Im Portal kann der Kunde Zahlungsmethoden, Rechnungen, Abos und Steuer-IDs
// verwalten — alles abgewickelt direkt bei Stripe (keine eigene Billing-UI).
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { getAppBaseUrl } from "@/lib/app-base-url"

export const runtime = "nodejs"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscription: { select: { stripeCustomerId: true } },
      },
    })
    if (!user) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 })
    }

    const customerId = user.subscription?.stripeCustomerId
    if (!customerId || customerId.startsWith("simulated_")) {
      // Free-/Sim-Nutzer haben (noch) keinen echten Stripe-Customer.
      return NextResponse.json(
        { ok: false, error: "no_stripe_customer" },
        { status: 400 }
      )
    }

    const base = getAppBaseUrl()
    let portal
    try {
      portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${base}/account`,
      })
    } catch (err) {
      const msg = (err as Error)?.message?.slice(0, 200)
      console.error("billing portal create failed", { message: msg })
      return NextResponse.json(
        {
          ok: false,
          error: "portal_unavailable",
          details:
            "Das Stripe Customer Portal ist nicht erreichbar. Im Stripe-Dashboard muss das Customer Portal aktiviert sein.",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, url: portal.url })
  } catch (err) {
    const msg = (err as Error)?.message?.slice(0, 200)
    console.error("customer portal error", { message: msg })
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 })
  }
}
