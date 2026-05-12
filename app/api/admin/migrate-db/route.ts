// app/api/admin/migrate-db/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Datenbankmigrationen werden ausschließlich über Prisma-Migrations ausgeführt." },
    { status: 410 }
  );
}
