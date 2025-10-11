// lib/admin-pro.ts
import prisma from "@/lib/db";

export async function ensureAdminProStatus() {
  try {
    // Finde alle Admin-User
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true, /* subscriptionStatus: true */ }
    });

    // Temporarily disabled - subscription fields not available
    // Setze alle Admins auf Pro-Status
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

export async function isAdminPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, /* subscriptionStatus: true */ }
  });

  if (!user) return false;
  
  // Admins sind automatisch Pro (vereinfacht)
  return user.role === "admin";
}
