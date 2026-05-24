import { NextResponse } from "next/server"
import { assertSameOrigin } from "@/lib/security"
import { quotaSubjectFromAccess, resolveGeneratorAccess } from "@/lib/generator-access"
import {
  getGeneratorQuota,
  signVisitorId,
  GENERATOR_VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/generator-limits"

export const runtime = "nodejs"

function quotaResponse(access: Awaited<ReturnType<typeof resolveGeneratorAccess>>) {
  return getGeneratorQuota(quotaSubjectFromAccess(access)).then((quota) => {
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
    })
    if (access.newVisitorId) {
      res.cookies.set(
        GENERATOR_VISITOR_COOKIE,
        signVisitorId(access.newVisitorId),
        visitorCookieOptions()
      )
    }
    return res
  })
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
