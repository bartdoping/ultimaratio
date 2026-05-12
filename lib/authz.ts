// lib/authz.ts
import type { Session } from "next-auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
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

export async function requireAdminJson() {
  let session: Session | null
  try {
    session = await getServerSession(authOptions)
  } catch (e) {
    if (isDynamicServerUsageError(e)) throw e
    console.error("[requireAdminJson] getServerSession:", e)
    return {
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      session: null,
      user: null,
    }
  }

  if (!session?.user?.email) {
    return {
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      session: null,
      user: null,
    }
  }

  try {
    const email = session.user.email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.role !== "admin") {
      return {
        response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
        session,
        user,
      }
    }

    return { response: null, session, user }
  } catch (e) {
    console.error("[requireAdminJson] DB:", e)
    return {
      response: NextResponse.json({ error: "server error" }, { status: 500 }),
      session,
      user: null,
    }
  }
}

export async function requireAdminMaintenanceJson() {
  const guard = await requireAdminJson()
  if (guard.response) return guard

  if (process.env.ADMIN_MAINTENANCE_ENABLED !== "true") {
    return {
      ...guard,
      response: NextResponse.json({ error: "not found" }, { status: 404 }),
    }
  }

  return guard
}
