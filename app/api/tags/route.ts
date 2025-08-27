import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true }
  })
  return NextResponse.json({ items: tags })
}