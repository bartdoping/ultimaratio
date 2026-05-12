// app/api/admin/create-test-user-direct/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Testnutzer werden nicht über öffentliche API-Routen angelegt." },
    { status: 410 }
  );
}
