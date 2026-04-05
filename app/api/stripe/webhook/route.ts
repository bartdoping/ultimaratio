// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import prisma from "@/lib/db";
import { activateProFromCheckoutSession } from "@/lib/stripe-subscription-activate";

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
      console.log("Processing checkout.session.completed:", { 
        sessionId: s.id, 
        paymentStatus: s.payment_status,
        mode: s.mode,
        metadata: s.metadata 
      });

      const userId = s.metadata?.userId as string | undefined;
      const examId = s.metadata?.examId as string | undefined;
      const stripeSessionId = s.id as string;

      // Abo-Checkout: nicht an payment_status === "paid" binden (u. a. no_payment_required, async Zahlarten)
      if (s.mode === "subscription" && userId) {
        const result = await activateProFromCheckoutSession(s);
        if (result.ok) {
          console.log("Subscription checkout → Pro aktiviert:", userId);
        } else {
          console.warn("Subscription checkout nicht aktiviert:", result.reason, {
            sessionId: s.id,
            payment_status: s.payment_status,
          });
        }
      }

      // Einmaliger Exam-Kauf: nur bei bezahlter Session
      if (userId && examId) {
        if (s.payment_status !== "paid") {
          console.log("Exam purchase skipped (not paid):", s.id);
        } else {
          const exists = await prisma.purchase.findFirst({ where: { userId, examId } });
          if (!exists) {
            await prisma.purchase.create({ data: { userId, examId, stripeSessionId } });
          }
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
      
      try {
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
          
          // Subscription-Tabelle aktualisieren
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer,
              status: "pro",
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: false,
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

          // User-Status aktualisieren
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: "pro" }
          });
          
          console.log("Subscription updated successfully for user:", userId);
        } else {
          console.error("Could not find userId for subscription:", subscription.id);
          // Fallback: Versuche über Customer ID zu finden
          if (subscription.customer) {
            const user = await prisma.user.findFirst({
              where: { 
                subscription: { 
                  stripeCustomerId: subscription.customer 
                } 
              },
              select: { id: true }
            });
            
            if (user) {
              console.log("Found user via customer ID, updating subscription");
              await prisma.subscription.upsert({
                where: { userId: user.id },
                create: {
                  userId: user.id,
                  stripeSubscriptionId: subscription.id,
                  stripeCustomerId: subscription.customer,
                  status: "pro",
                  currentPeriodStart: new Date(subscription.current_period_start * 1000),
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  cancelAtPeriodEnd: false,
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
                where: { id: user.id },
                data: { subscriptionStatus: "pro" }
              });
            }
          }
        }
      } catch (error) {
        console.error("Error processing subscription.created:", error);
        // Don't throw - let other webhooks continue
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      console.log("Processing subscription.updated:", { 
        subscriptionId: subscription.id,
        status: subscription.status 
      });
      
      try {
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

          // User-Status nur ändern wenn Abonnement wirklich beendet ist
          // Bei cancel_at_period_end bleibt User Pro bis zum Ende der Periode
          if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
            await prisma.user.updateMany({
              where: { subscription: { stripeSubscriptionId: subscription.id } },
              data: { subscriptionStatus: "free" }
            });
          } else if (subscription.status === "active") {
            // Bei aktiven Abonnements Pro-Status setzen
            await prisma.user.updateMany({
              where: { subscription: { stripeSubscriptionId: subscription.id } },
              data: { subscriptionStatus: "pro" }
            });
          }
        }
      } catch (error) {
        console.error("Error processing subscription.updated:", error);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      console.log("Processing subscription.deleted:", { 
        subscriptionId: subscription.id 
      });
      
      try {
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
      } catch (error) {
        console.error("Error processing subscription.deleted:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook handler failed:", e);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}