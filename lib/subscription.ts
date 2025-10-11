// lib/subscription.ts
import prisma from "@/lib/db";

export interface SubscriptionStatus {
  isPro: boolean;
  questionsRemaining: number;
  dailyQuestionsUsed: number;
  subscriptionDetails?: any;
}

export async function checkUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      // subscriptionStatus: true,
      // dailyQuestionsUsed: true,
      // lastQuestionResetAt: true,
      subscription: {
        select: {
          // status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true
        }
      }
    }
  });

  if (!user) {
    return { isPro: false, questionsRemaining: 0, dailyQuestionsUsed: 0 };
  }

  // Vereinfachte Logik: Prüfe nur ob User eine aktive Subscription hat
  const hasActiveSubscription = user.subscription && 
    user.subscription.currentPeriodEnd && 
    new Date(user.subscription.currentPeriodEnd) > new Date();

  const isPro = !!hasActiveSubscription;
  const questionsRemaining = isPro ? -1 : 20;

  return {
    isPro,
    questionsRemaining,
    dailyQuestionsUsed: 0, // Vereinfacht
    subscriptionDetails: user.subscription
  };
}

export async function incrementQuestionUsage(userId: string): Promise<boolean> {
  const status = await checkUserSubscriptionStatus(userId);
  
  // Pro-User haben unbegrenzten Zugang
  if (status.isPro) {
    return true;
  }

  // Prüfe Limit
  if (status.questionsRemaining <= 0) {
    return false;
  }

  // Temporarily disabled - daily tracking not available
  // Inkrementiere Zähler
  // await prisma.user.update({
  //   where: { id: userId },
  //   data: {
  //     dailyQuestionsUsed: {
  //       increment: 1
  //     }
  //   }
  // });

  return true;
}

export async function isUserPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, subscription: { select: { currentPeriodEnd: true } } }
  });

  if (!user) return false;
  
  // Admins sind automatisch Pro
  if (user.role === "admin") return true;
  
  // Prüfe aktive Subscription
  return user.subscription && 
    user.subscription.currentPeriodEnd && 
    new Date(user.subscription.currentPeriodEnd) > new Date();
}

export async function ensureAdminProStatus() {
  try {
    // Temporarily disabled - subscription fields not available
    // Finde alle Admin-User
    // const admins = await prisma.user.findMany({
    //   where: { role: "admin" },
    //   select: { id: true, email: true, subscriptionStatus: true }
    // });

    // // Setze alle Admins auf Pro-Status
    // for (const admin of admins) {
    //   if (admin.subscriptionStatus !== "pro") {
    //     await prisma.user.update({
    //       where: { id: admin.id },
    //       data: { subscriptionStatus: "pro" }
    //     });
    //     
    //     console.log(`Admin ${admin.email} set to Pro status`);
    //   }
    // }
  } catch (error) {
    console.error("Error ensuring admin pro status:", error);
  }
}
