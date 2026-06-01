import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"

export const runtime = "nodejs"

const ALLOWED_EXAM_TARGETS = new Set([
  "M1",
  "M2",
  "M3",
  "Hammerexamen",
  "Z1",
  "Z2",
  "Z3",
  "Physikum",
  "Klinik",
  "Andere",
])

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

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const examTarget =
    typeof body.examTarget === "string" && ALLOWED_EXAM_TARGETS.has(body.examTarget)
      ? body.examTarget
      : null
  const semesterRaw = Number(body.semester)
  const semester =
    Number.isFinite(semesterRaw) && semesterRaw >= 1 && semesterRaw <= 24
      ? Math.floor(semesterRaw)
      : null
  const skip = body.skip === true

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      examTarget: skip ? null : examTarget,
      semester: skip ? null : semester,
      onboardingCompletedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, skipped: skip })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: {
      onboardingCompletedAt: true,
      examTarget: true,
      semester: true,
    },
  })
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 })
  }
  return NextResponse.json({
    ok: true,
    completed: !!user.onboardingCompletedAt,
    examTarget: user.examTarget,
    semester: user.semester,
  })
}
