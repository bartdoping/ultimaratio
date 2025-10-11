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
      return NextResponse.json({ ok: false, error: "unauthorized" }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 2) User + Subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        subscriptionStatus: true,
        dailyQuestionsUsed: true,
        lastQuestionResetAt: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true
          }
        }
      },
    });
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    // 3) Tageslimit berechnen
    const now = new Date();
    const lastReset = new Date(user.lastQuestionResetAt);
    const isNewDay = now.toDateString() !== lastReset.toDateString();
    
    const questionsRemaining = user.subscriptionStatus === "pro" 
      ? -1 // Unbegrenzt für Pro-User
      : Math.max(0, 20 - (isNewDay ? 0 : user.dailyQuestionsUsed));

    return NextResponse.json({ 
      ok: true,
      subscription: {
        status: user.subscriptionStatus,
        isPro: user.subscriptionStatus === "pro",
        questionsRemaining,
        dailyQuestionsUsed: isNewDay ? 0 : user.dailyQuestionsUsed,
        subscriptionDetails: user.subscription,
        // Abonnement-Daten
        nextPaymentDate: user.subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || false,
        periodStart: user.subscription?.currentPeriodStart,
        periodEnd: user.subscription?.currentPeriodEnd
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (err: any) {
    console.error("subscription status error", err);
    return NextResponse.json({ ok: false, error: "status failed" }, { status: 500 });
  }
}
