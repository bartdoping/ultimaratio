import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Tabellen-Reparaturen laufen über geprüfte Prisma-Migrations." },
    { status: 410 }
  );
}
