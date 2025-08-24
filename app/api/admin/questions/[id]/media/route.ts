// app/api/admin/questions/[id]/media/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"

const attachSchema = z.object({
  mediaId: z.string().min(1),
  order: z.number().int().min(0).optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me || me.role !== "admin") return NextResponse.json({ ok: false }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = attachSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })

  const { mediaId, order = 0 } = parsed.data

  // sicherstellen, dass beides existiert
  const [q, m] = await Promise.all([
    prisma.question.findUnique({ where: { id } }),
    prisma.mediaAsset.findUnique({ where: { id: mediaId } }),
  ])
  if (!q || !m) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })

  await prisma.questionMedia.upsert({
    where: { questionId_mediaId: { questionId: id, mediaId } },
    update: { order },
    create: { questionId: id, mediaId, order },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me || me.role !== "admin") return NextResponse.json({ ok: false }, { status: 403 })

  // mediaId via Query ?mediaId=...
  const url = new URL(req.url)
  const mediaId = url.searchParams.get("mediaId")
  if (!mediaId) return NextResponse.json({ ok: false, error: "missing mediaId" }, { status: 400 })

  await prisma.questionMedia.delete({
    where: { questionId_mediaId: { questionId: id, mediaId } },
  })

  return NextResponse.json({ ok: true })
}