// app/api/admin/users/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireAdminJson } from "@/lib/authz"

export const runtime = "nodejs"

// GET: Alle User für Admin
export async function GET() {
  const guard = await requireAdminJson()
  if (guard.response) return guard.response

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            stripeSubscriptionId: true
          }
        },
        _count: {
          select: {
            attempts: true,
            purchases: true,
            decks: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
