import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { getStreak } from "@/lib/streak"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  }
  const streak = await getStreak(user.id)
  return NextResponse.json({ ok: true, streak })
}
