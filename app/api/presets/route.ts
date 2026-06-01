import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { randomBytes } from "crypto"
import { GENERATOR_TOPIC_MAX } from "@/lib/generator-ai-config"

export const runtime = "nodejs"

const MAX_PRESETS_PER_USER = 30

function slug(len = 8): string {
  return randomBytes(len).toString("base64url").slice(0, len)
}

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
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 })
  }
  const presets = await prisma.generatorPreset.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ ok: true, presets })
}

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
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const title = String(body.title ?? "").trim().slice(0, 80)
  const topic = String(body.topic ?? "").trim().slice(0, GENERATOR_TOPIC_MAX)
  const difficulty = Math.min(5, Math.max(1, Math.floor(Number(body.difficulty) || 3)))
  const mode = body.mode === "case" ? "case" : "single"
  const caseQuestionCount =
    mode === "case"
      ? Math.min(5, Math.max(2, Math.floor(Number(body.caseQuestionCount) || 3)))
      : null
  const share = body.share === true

  if (!title || !topic || topic.length < 3) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", message: "Titel und Thema sind erforderlich." },
      { status: 400 }
    )
  }

  // Cap pro User
  const existingCount = await prisma.generatorPreset.count({
    where: { userId: user.id },
  })
  if (existingCount >= MAX_PRESETS_PER_USER) {
    return NextResponse.json(
      {
        ok: false,
        error: "limit_reached",
        message: `Maximal ${MAX_PRESETS_PER_USER} Presets pro Account.`,
      },
      { status: 409 }
    )
  }

  // Eindeutigen Slug erzeugen (Retry bei Konflikt)
  let publicSlug: string | null = null
  if (share) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = slug(8 + attempt)
      const taken = await prisma.generatorPreset.findUnique({
        where: { publicSlug: candidate },
        select: { id: true },
      })
      if (!taken) {
        publicSlug = candidate
        break
      }
    }
  }

  const preset = await prisma.generatorPreset.create({
    data: {
      userId: user.id,
      title,
      topic,
      difficulty,
      mode,
      caseQuestionCount,
      publicSlug,
    },
  })

  return NextResponse.json({ ok: true, preset })
}
