// app/api/admin/create-enums/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Enums werden ausschließlich über Prisma-Migrations verwaltet." },
    { status: 410 }
  );
}
