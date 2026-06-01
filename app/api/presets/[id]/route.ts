import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"

export const runtime = "nodejs"

type RouteCtx = { params: Promise<{ id: string }> }

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }
  const { id } = await ctx.params
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
  const preset = await prisma.generatorPreset.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })
  if (!preset || preset.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  }
  await prisma.generatorPreset.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  // Public-Slug-Lookup: jeder darf das Preset einsehen, wenn es geteilt wurde.
  const preset = await prisma.generatorPreset.findFirst({
    where: { OR: [{ id }, { publicSlug: id }] },
    select: {
      id: true,
      title: true,
      topic: true,
      difficulty: true,
      mode: true,
      caseQuestionCount: true,
      publicSlug: true,
    },
  })
  if (!preset) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true, preset })
}
