// app/api/admin/media/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { z } from "zod"
import { requireAdminJson } from "@/lib/authz"

export const runtime = "nodejs"

const bodySchema = z.object({
  url: z.string().url().or(z.string().startsWith("/")),
  alt: z.string().optional(),
})

export async function POST(req: Request) {
  const guard = await requireAdminJson()
  if (guard.response) return guard.response

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  }

  const { url, alt } = parsed.data

  // idempotent: gleiche URL -> derselbe Datensatz
  const media = await prisma.mediaAsset.upsert({
    where: { url },
    update: { alt },
    create: { url, alt, kind: "image" },
    select: { id: true, url: true, alt: true },
  })

  return NextResponse.json({ ok: true, media })
}