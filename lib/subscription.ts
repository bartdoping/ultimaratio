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
      subscriptionStatus: true,
      dailyQuestionsUsed: true,
      lastQuestionResetAt: true,
      subscription: {
        select: {
          status: true,
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

  // Prüfe ob neuer Tag
  const now = new Date();
  const lastReset = new Date(user.lastQuestionResetAt);
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  // Reset tägliche Fragen wenn neuer Tag
  if (isNewDay) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailyQuestionsUsed: 0,
        lastQuestionResetAt: now
      }
    });
  }

  const questionsUsed = isNewDay ? 0 : user.dailyQuestionsUsed;
  const isPro = user.subscriptionStatus === "pro";
  const questionsRemaining = isPro ? -1 : Math.max(0, 20 - questionsUsed);

  return {
    isPro,
    questionsRemaining,
    dailyQuestionsUsed: questionsUsed,
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

  // Inkrementiere Zähler
  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyQuestionsUsed: {
        increment: 1
      }
    }
  });

  return true;
}

export async function isUserPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, role: true }
  });

  if (!user) return false;
  
  // Admins sind automatisch Pro
  if (user.role === "admin") return true;
  
  return user.subscriptionStatus === "pro";
}

export async function ensureAdminProStatus() {
  try {
    // Finde alle Admin-User
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true, subscriptionStatus: true }
    });

    // Setze alle Admins auf Pro-Status
    for (const admin of admins) {
      if (admin.subscriptionStatus !== "pro") {
        await prisma.user.update({
          where: { id: admin.id },
          data: { subscriptionStatus: "pro" }
        });
        
        console.log(`Admin ${admin.email} set to Pro status`);
      }
    }
  } catch (error) {
    console.error("Error ensuring admin pro status:", error);
  }
}
