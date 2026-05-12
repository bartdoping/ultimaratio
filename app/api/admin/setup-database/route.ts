// app/api/admin/setup-database/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Datenbank-Setup läuft über Prisma-Migrations, nicht über öffentliche API-Routen." },
    { status: 410 }
  );
}
