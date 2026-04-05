// lib/subscription.ts
import prisma from "@/lib/db"

export async function isUserPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, role: true },
  })

  if (!user) return false

  if (user.role === "admin") return true

  return user.subscriptionStatus === "pro"
}

export async function ensureAdminProStatus() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, email: true, subscriptionStatus: true },
    })

    for (const admin of admins) {
      if (admin.subscriptionStatus !== "pro") {
        await prisma.user.update({
          where: { id: admin.id },
          data: { subscriptionStatus: "pro" },
        })

        console.log(`Admin ${admin.email} set to Pro status`)
      }
    }
  } catch (error) {
    console.error("Error ensuring admin pro status:", error)
  }
}
