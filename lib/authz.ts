// lib/authz.ts
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

/** Leitet ab statt Error zu werfen — vermeidet 500 in Production bei fehlender Session/Admin-Rolle. */
export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect("/login")
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.role !== "admin") {
    redirect("/")
  }
  return { session, user }
}
