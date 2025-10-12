// app/api/admin/force-sync-subscription/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Nur Admins dürfen das
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || 
        (session.user.email !== "info@ultima-rat.io" && session.user.email !== "admin@fragenkreuzen.de")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    console.log("Force syncing subscription for user:", userId);

    // User finden
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            id: true,
            stripeSubscriptionId: true,
            stripeCustomerId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: "No Stripe subscription found" }, { status: 404 });
    }

    // Stripe Subscription abrufen
    const stripeSubscription = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId);
    
    console.log("Stripe subscription data:", {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
    });
    
    // DB aktualisieren
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer as string,
        status: stripeSubscription.status === "active" ? "pro" : "free",
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
        createdAt: new Date()
      },
      update: {
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer as string,
        status: stripeSubscription.status === "active" ? "pro" : "free",
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
      }
    });

    // User Status aktualisieren
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: stripeSubscription.status === "active" ? "pro" : "free"
      }
    });

    return NextResponse.json({ 
      ok: true, 
      message: `Subscription synced for user ${user.email}`,
      subscription: {
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      }
    });

  } catch (error) {
    console.error("Error in force sync subscription:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
