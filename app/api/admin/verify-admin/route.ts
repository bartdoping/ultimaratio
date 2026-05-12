// app/api/admin/verify-admin/route.ts
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// POST: Admin-User verifizieren
export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Admin-Verifizierung wird nicht über eine öffentliche API-Route durchgeführt." },
    { status: 410 }
  )
}
