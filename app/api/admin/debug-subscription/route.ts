// app/api/admin/debug-subscription/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Nur Admins dürfen das
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || 
        (session.user.email !== "info@ultima-rat.io" && session.user.email !== "admin@fragenkreuzen.de")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
