// app/api/stripe/subscription/cancel/route.ts
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

    // 2) User + Subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            status: true
          }
        }
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    if (!user.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ 
        ok: false, 
        error: "Kein aktives Abonnement gefunden. Bitte kontaktiere den Support." 
      }, { status: 400 });
    }

    // 3) Stripe Subscription kündigen
    try {
      await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      console.log("Stripe subscription cancelled:", user.subscription.stripeSubscriptionId);
    } catch (stripeError: any) {
      console.error("Stripe cancellation error:", stripeError);
      // Continue with DB update even if Stripe fails
    }

    // 4) DB aktualisieren
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        cancelAtPeriodEnd: true,
        status: "free"
      }
    });

    // 5) User Status aktualisieren
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "free"
      }
    });

    return NextResponse.json({ ok: true, message: "subscription_cancelled" });
  } catch (err: any) {
    console.error("subscription cancel error", err);
    return NextResponse.json({ 
      ok: false, 
      error: `Kündigung fehlgeschlagen: ${err.message || "Unbekannter Fehler"}` 
    }, { status: 500 });
  }
}
