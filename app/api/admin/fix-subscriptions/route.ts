// app/api/admin/fix-subscriptions/route.ts
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

    console.log("Starting subscription fix...");

    // Alle Pro-User finden
    const proUsers = await prisma.user.findMany({
      where: { subscriptionStatus: "pro" },
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
            createdAt: true
          }
        }
      }
    });

    console.log(`Found ${proUsers.length} pro users`);

    let fixed = 0;
    let errors = 0;

    for (const user of proUsers) {
      try {
        if (user.subscription?.stripeSubscriptionId) {
          // Stripe Subscription abrufen
          const stripeSubscription = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId);
          
          console.log(`Fixing subscription for user ${user.email}:`, {
            stripeId: stripeSubscription.id,
            status: stripeSubscription.status,
            currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
            cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end
          });
          
          // DB aktualisieren mit korrekten Daten
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

          // User-Status nur ändern wenn Abonnement wirklich beendet ist
          if (stripeSubscription.status === "canceled" || stripeSubscription.status === "incomplete_expired") {
            await prisma.user.update({
              where: { id: user.id },
              data: { subscriptionStatus: "free" }
            });
            console.log(`User ${user.email} set to free (subscription ended)`);
          } else {
            // Bei aktiven oder gekündigten (aber noch laufenden) Abonnements Pro-Status beibehalten
            await prisma.user.update({
              where: { id: user.id },
              data: { subscriptionStatus: "pro" }
            });
            console.log(`User ${user.email} remains pro (subscription active or cancelled but still valid)`);
          }

          console.log(`Fixed subscription for user ${user.email}`);
          fixed++;
        } else {
          console.log(`User ${user.email} has no Stripe subscription ID - keeping as pro (admin/test user)`);
          fixed++;
        }
      } catch (error) {
        console.error(`Error fixing user ${user.email}:`, error);
        errors++;
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Subscription fix completed. Fixed: ${fixed}, Errors: ${errors}`,
      fixed,
      errors
    });

  } catch (error) {
    console.error("Error in subscription fix:", error);
    return NextResponse.json(
      { error: "Failed to fix subscriptions" },
      { status: 500 }
    );
  }
}
