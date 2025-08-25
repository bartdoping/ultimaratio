// app/api/account/profile/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

const Schema = z.object({
  name: z.string().min(1).max(100),
  surname: z.string().min(1).max(100),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingaben." }, { status: 400 })
  }

  const { name, surname } = parsed.data
  await prisma.user.update({
    where: { id: me.id },
    data: { name, surname },
  })

  return NextResponse.json({ ok: true })
}