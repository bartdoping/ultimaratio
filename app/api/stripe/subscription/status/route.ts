// app/api/stripe/subscription/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
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
        // subscriptionStatus: true,
        // dailyQuestionsUsed: true,
        // lastQuestionResetAt: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            // status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true
          }
        }
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    // 3) Tageslimit berechnen (vereinfacht)
    const questionsRemaining = user.subscription?.stripeSubscriptionId 
      ? -1 // Unbegrenzt für Pro-User
      : 20; // Standard-Limit für Free-User

    return NextResponse.json({ 
      ok: true,
      subscription: {
        status: user.subscription?.stripeSubscriptionId ? "pro" : "free",
        isPro: !!user.subscription?.stripeSubscriptionId,
        questionsRemaining,
        dailyQuestionsUsed: 0, // Vereinfacht
        subscriptionDetails: user.subscription
      }
    });
  } catch (err: any) {
    console.error("subscription status error", err);
    return NextResponse.json({ ok: false, error: "status failed" }, { status: 500 });
  }
}
