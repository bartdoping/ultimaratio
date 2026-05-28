// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server"
import stripe from "@/lib/stripe"
import prisma from "@/lib/db"
import { activateProFromCheckoutSession } from "@/lib/stripe-subscription-activate"
import { applyStripeSubscriptionToDatabase } from "@/lib/stripe-subscription-webhook-sync"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) return new NextResponse("Missing webhook secret", { status: 400 })

  const body = await req.text()
  let event: any

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as any
      // Kein vollständiges Session-Objekt loggen (enthält Mail, Adressen, …).

      const userId = s.metadata?.userId as string | undefined
      const examId = s.metadata?.examId as string | undefined
      const stripeSessionId = s.id as string

      if (s.mode === "subscription" && userId) {
        const result = await activateProFromCheckoutSession(s)
        if (!result.ok) {
          console.warn("Subscription checkout nicht aktiviert", {
            reason: result.reason,
            payment_status: s.payment_status,
          })
        }
      }

      if (userId && examId && s.mode === "payment") {
        if (s.payment_status !== "paid") {
          // unpaid – nichts loggen, keine Aktion.
        } else {
          const exists = await prisma.purchase.findFirst({
            where: { userId, examId },
          })
          if (!exists) {
            await prisma.purchase.create({
              data: { userId, examId, stripeSessionId },
            })
          }
        }
      }
    }

    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as any
      try {
        await applyStripeSubscriptionToDatabase(subscription)
      } catch (error) {
        console.error("subscription.created apply failed", {
          eventId: event.id,
          message: (error as Error)?.message?.slice(0, 200),
        })
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any
      try {
        await applyStripeSubscriptionToDatabase(subscription)
      } catch (error) {
        console.error("subscription.updated apply failed", {
          eventId: event.id,
          message: (error as Error)?.message?.slice(0, 200),
        })
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any
      try {
        await applyStripeSubscriptionToDatabase(subscription)
      } catch (error) {
        console.error("subscription.deleted apply failed", {
          eventId: event.id,
          message: (error as Error)?.message?.slice(0, 200),
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error("Webhook handler failed", {
      eventType: event?.type,
      message: (e as Error)?.message?.slice(0, 200),
    })
    return new NextResponse("Webhook handler failed", { status: 500 })
  }
}
