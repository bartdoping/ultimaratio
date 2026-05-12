// app/api/admin/fix-admin/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Admin-Rollen werden nicht über öffentliche API-Reparaturrouten geändert." },
    { status: 410 }
  );
}
