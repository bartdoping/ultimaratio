// app/api/stripe/subscription/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
            status: true
          }
        }
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    // 3) Prüfe ob bereits Pro-User
    if (user.subscriptionStatus === "pro") {
      return NextResponse.json({ ok: false, error: "already_pro" }, { status: 400 });
    }

    // 4) Stripe Customer erstellen oder finden
    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      
      // Customer ID in DB speichern
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeCustomerId: customerId,
          status: "free",
          createdAt: new Date()
        },
        update: {
          stripeCustomerId: customerId
        }
      });
    }

    // 5) Subscription Checkout Session erstellen
    const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    
    // Verwende vordefinierte Preis-ID oder erstelle dynamisch
    const priceId = process.env.STRIPE_PRICE_ID;
    
    let lineItems: any[];
    if (priceId) {
      // Verwende vordefinierte Preis-ID
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      // Erstelle Preis dynamisch
      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "fragenkreuzen.de Pro",
              description: "Unbegrenzter Zugang zu allen Prüfungsfragen",
            },
            unit_amount: 999, // 9,99€ in Cent
            recurring: {
              interval: "month" as const,
            },
          },
          quantity: 1,
        },
      ];
    }
    
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: lineItems,
      success_url: `${base}/dashboard?subscription=success`,
      cancel_url: `${base}/dashboard?subscription=cancelled`,
      metadata: {
        userId: user.id,
        userEmail: user.email,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          userEmail: user.email,
        },
      },
    });

    return NextResponse.json({ ok: true, url: checkoutSession.url });
  } catch (err: any) {
    console.error("subscription checkout error", err);
    
    // Detaillierte Fehlermeldung für besseres Debugging
    const errorMessage = err.message || "Unbekannter Fehler";
    const errorType = err.type || "unknown";
    
    return NextResponse.json({ 
      ok: false, 
      error: "checkout failed",
      details: errorMessage,
      type: errorType
    }, { status: 500 });
  }
}
