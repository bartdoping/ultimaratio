// lib/authz.ts
import type { Session } from "next-auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

function isDynamicServerUsageError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    (e as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  )
}

/** Leitet ab statt Error zu werfen — vermeidet 500 in Production bei fehlender Session/Admin-Rolle. */
export async function requireAdmin() {
  let session: Session | null
  try {
    session = await getServerSession(authOptions)
  } catch (e) {
    if (isDynamicServerUsageError(e)) throw e
    // next-auth getServerSession wirft bei Session-Fehlern (z. B. JWT/Secret) statt null zurück
    console.error("[requireAdmin] getServerSession:", e)
    redirect("/login")
  }
  if (!session?.user?.email) {
    redirect("/login")
  }
  const email = session.user.email.toLowerCase().trim()
  let user
  try {
    user = await prisma.user.findUnique({ where: { email } })
  } catch (e) {
    console.error("[requireAdmin] DB:", e)
    redirect("/login")
  }
  if (!user || user.role !== "admin") {
    redirect("/")
  }
  return { session, user }
}
