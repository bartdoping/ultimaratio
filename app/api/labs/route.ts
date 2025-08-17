// app/api/labs/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET() {
  const labs = await prisma.labValue.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] })
  return NextResponse.json({ labs })
}
