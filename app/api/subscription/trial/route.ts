import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { getProAccess } from "@/lib/subscription"

export const runtime = "nodejs"

/** Dauer der kostenlosen Pro-Testphase in Tagen. */
const PRO_TRIAL_DAYS = 7

/**
 * POST /api/subscription/trial — startet die 7-Tage-Pro-Testphase ohne
 * Zahlungsdaten. Genau einmal pro User möglich.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: {
      id: true,
      proTrialStartedAt: true,
      proTrialEndsAt: true,
      role: true,
    },
  })

  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 })
  }

  if (user.role === "admin") {
    return NextResponse.json({
      ok: true,
      alreadyPro: true,
      reason: "admin",
      trialEndsAt: null,
    })
  }

  // Bereits aktives Trial oder Abo?
  const access = await getProAccess(user.id)
  if (access.kind === "subscription") {
    return NextResponse.json({
      ok: false,
      error: "already_subscribed",
      message: "Du hast bereits ein aktives Pro-Abo.",
    }, { status: 409 })
  }

  if (access.kind === "trial") {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      trialEndsAt: access.trialEndsAt,
    })
  }

  // Wurde Trial schon einmal genutzt? → kein Re-Start möglich.
  if (user.proTrialStartedAt) {
    return NextResponse.json(
      {
        ok: false,
        error: "trial_used",
        message:
          "Die kostenlose Pro-Testphase wurde bereits genutzt. Schließe ein Abo ab, um Pro weiter zu nutzen.",
      },
      { status: 409 }
    )
  }

  const now = new Date()
  const endsAt = new Date(now.getTime() + PRO_TRIAL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      proTrialStartedAt: now,
      proTrialEndsAt: endsAt,
    },
  })

  return NextResponse.json({
    ok: true,
    started: true,
    trialDays: PRO_TRIAL_DAYS,
    trialEndsAt: endsAt.toISOString(),
  })
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 })
}
