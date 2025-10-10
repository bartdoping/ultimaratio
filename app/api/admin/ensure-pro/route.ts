// app/api/admin/ensure-pro/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { ensureAdminProStatus } from "@/lib/subscription";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await ensureAdminProStatus();
    
    return NextResponse.json({ ok: true, message: "Admin pro status ensured" });
  } catch (error) {
    console.error("Error ensuring admin pro status:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
