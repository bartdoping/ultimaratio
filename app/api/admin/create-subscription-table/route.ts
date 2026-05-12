// app/api/admin/create-subscription-table/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "disabled", message: "Subscription-Schemaänderungen laufen über Prisma-Migrations." },
    { status: 410 }
  );
}
