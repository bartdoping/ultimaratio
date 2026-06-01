import { NextResponse } from "next/server"
import { assertSameOrigin } from "@/lib/security"
import { quotaSubjectFromAccess, resolveGeneratorAccess } from "@/lib/generator-access"
import {
  getGeneratorQuota,
  signVisitorId,
  GENERATOR_VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/generator-limits"
import prisma from "@/lib/db"

export const runtime = "nodejs"

async function loadTrialInfo(userId: string | undefined) {
  if (!userId) return { eligible: false, endsAt: null as string | null }
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { proTrialStartedAt: true, proTrialEndsAt: true, role: true },
  })
  if (!u) return { eligible: false, endsAt: null }
  const endsAt = u.proTrialEndsAt ?? null
  const trialActive = endsAt ? new Date(endsAt).getTime() > Date.now() : false
  return {
    eligible: u.role !== "admin" && !u.proTrialStartedAt,
    endsAt: trialActive && endsAt ? endsAt.toISOString() : null,
  }
}

async function quotaResponse(access: Awaited<ReturnType<typeof resolveGeneratorAccess>>) {
  const [quota, trial] = await Promise.all([
    getGeneratorQuota(quotaSubjectFromAccess(access)),
    loadTrialInfo(access.user?.id),
  ])
  const res = NextResponse.json({
    ok: true,
    quota: {
      used: quota.used,
      remaining: quota.remaining,
      dailyLimit: quota.dailyLimit,
      unlimited: quota.unlimited,
    },
    isLoggedIn: access.isLoggedIn,
    isPro: access.isPro,
    trialEligible: trial.eligible,
    trialEndsAt: trial.endsAt,
  })
  if (access.newVisitorId) {
    res.cookies.set(
      GENERATOR_VISITOR_COOKIE,
      signVisitorId(access.newVisitorId),
      visitorCookieOptions()
    )
  }
  return res
}

export async function GET(req: Request) {
  try {
    const access = await resolveGeneratorAccess(req)
    return quotaResponse(access)
  } catch (e) {
    console.error("generator quota GET failed:", e)
    return NextResponse.json({ ok: false, error: "quota_unavailable" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const access = await resolveGeneratorAccess(req)
    return quotaResponse(access)
  } catch (e: unknown) {
    const err = e as { status?: number }
    if (err?.status) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status })
    }
    console.error("generator quota POST failed:", e)
    return NextResponse.json({ ok: false, error: "quota_unavailable" }, { status: 500 })
  }
}
