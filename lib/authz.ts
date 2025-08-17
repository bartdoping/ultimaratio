// lib/authz.ts
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("UNAUTHORIZED")
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN")
  return { session, user }
}
