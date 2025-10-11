// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new NextResponse("Missing webhook secret", { status: 400 });

  const body = await req.text();
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as any;
      if (s.payment_status !== "paid") return NextResponse.json({ ok: true });

      const userId = s.metadata?.userId as string | undefined;
      const examId = s.metadata?.examId as string | undefined;
      const stripeSessionId = s.id as string;

      if (userId && examId) {
        const exists = await prisma.purchase.findFirst({ where: { userId, examId } });
        if (!exists) {
          await prisma.purchase.create({ data: { userId, examId, stripeSessionId } });
        }
      }
    }

    // Subscription Events
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as any;
      console.log("Processing subscription.created:", { 
        subscriptionId: subscription.id, 
        customerId: subscription.customer,
        metadata: subscription.metadata 
      });
      
      // Versuche userId aus verschiedenen Quellen zu bekommen
      let userId = subscription.metadata?.userId;
      
      // Fallback: Suche User über Customer ID
      if (!userId && subscription.customer) {
        const user = await prisma.user.findFirst({
          where: { 
            subscription: { 
              stripeCustomerId: subscription.customer 
            } 
          },
          select: { id: true }
        });
        userId = user?.id;
      }
      
      if (userId) {
        console.log("Updating subscription for user:", userId);
        
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            status: "pro",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            createdAt: new Date()
          },
          update: {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            status: "pro",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: false,
          }
        });

        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: "pro" }
        });
        
        console.log("Subscription updated successfully for user:", userId);
      } else {
        console.error("Could not find userId for subscription:", subscription.id);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.userId;
      
      if (userId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status === "active" ? "pro" : "free",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        });

        await prisma.user.updateMany({
          where: { subscription: { stripeSubscriptionId: subscription.id } },
          data: { 
            // subscriptionStatus: subscription.status === "active" ? "pro" : "free" 
          }
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.userId;
      
      if (userId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "free" }
        });

        await prisma.user.updateMany({
          where: { subscription: { stripeSubscriptionId: subscription.id } },
          data: { subscriptionStatus: "free" }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook handler failed:", e);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}