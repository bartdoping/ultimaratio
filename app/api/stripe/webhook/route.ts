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
      console.log("Processing checkout.session.completed:", {
        sessionId: s.id,
        paymentStatus: s.payment_status,
        mode: s.mode,
        metadata: s.metadata,
      })

      const userId = s.metadata?.userId as string | undefined
      const examId = s.metadata?.examId as string | undefined
      const stripeSessionId = s.id as string

      if (s.mode === "subscription" && userId) {
        const result = await activateProFromCheckoutSession(s)
        if (result.ok) {
          console.log("Subscription checkout → Pro aktiviert:", userId)
        } else {
          console.warn("Subscription checkout nicht aktiviert:", result.reason, {
            sessionId: s.id,
            payment_status: s.payment_status,
          })
        }
      }

      if (userId && examId && s.mode === "payment") {
        if (s.payment_status !== "paid") {
          console.log("Exam purchase skipped (not paid):", s.id)
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
      console.log("Processing subscription.created:", {
        subscriptionId: subscription.id,
        status: subscription.status,
      })
      try {
        await applyStripeSubscriptionToDatabase(subscription)
      } catch (error) {
        console.error("Error processing subscription.created:", error)
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any
      console.log("Processing subscription.updated:", {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      try {
        await applyStripeSubscriptionToDatabase(subscription)
      } catch (error) {
        console.error("Error processing subscription.updated:", error)
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any
      console.log("Processing subscription.deleted:", {
        subscriptionId: subscription.id,
      })
      try {
        await applyStripeSubscriptionToDatabase(subscription)
      } catch (error) {
        console.error("Error processing subscription.deleted:", error)
      }
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error("Webhook handler failed:", e)
    return new NextResponse("Webhook handler failed", { status: 500 })
  }
}
