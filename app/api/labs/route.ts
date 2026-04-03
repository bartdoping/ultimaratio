// app/api/labs/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { ensureLaborH24InDb } from "@/lib/import-labor-h24"

export async function GET() {
  await ensureLaborH24InDb()
  const labs = await prisma.labValue.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] })
  return NextResponse.json({ labs })
}
