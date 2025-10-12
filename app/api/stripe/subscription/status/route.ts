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
        createdAt: true,
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

    // Berechne verbleibende Tage für gekündigte Abonnements
    let daysRemaining = null;
    if (user.subscription?.cancelAtPeriodEnd && user.subscription?.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(user.subscription.currentPeriodEnd);
      const diffTime = periodEnd.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Für Pro-User ohne Abonnement-Details: Simuliere theoretische Periode
    let simulatedNextPayment = null;
    let simulatedPeriodStart = null;
    let simulatedCancelAtPeriodEnd = false;
    
    if (user.subscriptionStatus === "pro" && !user.subscription?.currentPeriodEnd) {
      // Simuliere 30-Tage-Periode ab heute
      const now = new Date();
      simulatedPeriodStart = new Date(now);
      simulatedNextPayment = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 Tage
      
      // Prüfe ob User bereits "gekündigt" hat (simuliert)
      // Für Test-User: Simuliere Kündigung nach 1 Tag
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      if (user.createdAt && new Date(user.createdAt) < oneDayAgo) {
        // User ist älter als 1 Tag -> simuliere gekündigtes Abonnement
        simulatedCancelAtPeriodEnd = true;
        
        // Berechne verbleibende Tage für simulierte gekündigte Abonnements
        const diffTime = simulatedNextPayment.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    console.log("API Debug - User subscription data:", {
      userId: user.id,
      subscriptionStatus: user.subscriptionStatus,
      subscription: user.subscription,
      questionsRemaining,
      isPro: user.subscriptionStatus === "pro"
    });

    return NextResponse.json({ 
      ok: true,
      subscription: {
        status: user.subscriptionStatus,
        isPro: user.subscriptionStatus === "pro",
        questionsRemaining,
        dailyQuestionsUsed: isNewDay ? 0 : user.dailyQuestionsUsed,
        subscriptionDetails: user.subscription,
        // Abonnement-Daten (echte oder simulierte)
        nextPaymentDate: user.subscription?.currentPeriodEnd || simulatedNextPayment,
        cancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || simulatedCancelAtPeriodEnd,
        periodStart: user.subscription?.currentPeriodStart || simulatedPeriodStart,
        periodEnd: user.subscription?.currentPeriodEnd || simulatedNextPayment,
        daysRemaining: daysRemaining,
        // Zusätzliche Info für simulierte Abonnements
        isSimulated: !user.subscription?.currentPeriodEnd && user.subscriptionStatus === "pro"
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
