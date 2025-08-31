// app/api/sr/settings/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const st = await prisma.sRUserSetting.findUnique({ where: { userId } })
  return NextResponse.json(st ?? {
    userId,
    newPerDay: 20, reviewsPerDay: 200, startEase: 2.5, easeMin: 1.3, easeMax: 2.7, learningSteps: [1,3,7],
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (Number.isFinite(body?.newPerDay)) data.newPerDay = Math.max(0, Math.floor(body.newPerDay))
  if (Number.isFinite(body?.reviewsPerDay)) data.reviewsPerDay = Math.max(0, Math.floor(body.reviewsPerDay))
  if (typeof body?.startEase === "number") data.startEase = body.startEase
  if (typeof body?.easeMin === "number") data.easeMin = body.easeMin
  if (typeof body?.easeMax === "number") data.easeMax = body.easeMax
  if (Array.isArray(body?.learningSteps)) data.learningSteps = body.learningSteps

  const st = await prisma.sRUserSetting.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })
  return NextResponse.json(st)
}