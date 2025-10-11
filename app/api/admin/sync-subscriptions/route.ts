// app/api/admin/sync-subscriptions/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    // Nur Admins dürfen das
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || 
        (session.user.email !== "info@ultima-rat.io" && session.user.email !== "admin@fragenkreuzen.de")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting subscription sync...");

    // Alle Pro-User finden
    const proUsers = await prisma.user.findMany({
      where: { subscriptionStatus: "pro" },
      select: { 
        id: true, 
        email: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            stripeCustomerId: true
          }
        }
      }
    });

    console.log(`Found ${proUsers.length} pro users`);

    let synced = 0;
    let errors = 0;

    for (const user of proUsers) {
      try {
        if (user.subscription?.stripeSubscriptionId) {
          // Stripe Subscription abrufen
          const stripeSubscription = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId);
          
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

          console.log(`Synced subscription for user ${user.email}`);
          synced++;
        } else {
          console.log(`User ${user.email} has no Stripe subscription ID`);
        }
      } catch (error) {
        console.error(`Error syncing user ${user.email}:`, error);
        errors++;
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Subscription sync completed. Synced: ${synced}, Errors: ${errors}`,
      synced,
      errors
    });

  } catch (error) {
    console.error("Error in subscription sync:", error);
    return NextResponse.json(
      { error: "Failed to sync subscriptions" },
      { status: 500 }
    );
  }
}
