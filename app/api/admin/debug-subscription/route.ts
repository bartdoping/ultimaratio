// app/api/admin/debug-subscription/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdminJson } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET() {
  try {
    const guard = await requireAdminJson();
    if (guard.response) return guard.response;

    // Alle User mit ihren Abonnement-Daten abrufen
    const users = await prisma.user.findMany({
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

    return NextResponse.json({ 
      ok: true, 
      users,
      count: users.length
    });

  } catch (error) {
    console.error("Error in debug subscription:", error);
    return NextResponse.json(
      { error: "Failed to debug subscriptions" },
      { status: 500 }
    );
  }
}
