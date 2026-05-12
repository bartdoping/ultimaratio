// app/api/admin/ensure-pro/route.ts
import { NextResponse } from "next/server";
import { ensureAdminProStatus } from "@/lib/subscription";
import { requireAdminJson } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST() {
  try {
    const guard = await requireAdminJson();
    if (guard.response) return guard.response;

    await ensureAdminProStatus();
    
    return NextResponse.json({ ok: true, message: "Admin pro status ensured" });
  } catch (error) {
    console.error("Error ensuring admin pro status:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
