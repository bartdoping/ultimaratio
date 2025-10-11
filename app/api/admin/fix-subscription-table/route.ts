import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    // Nur Admins dürfen das
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || 
        (session.user.email !== "info@ultima-rat.io" && session.user.email !== "admin@fragenkreuzen.de")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Füge updatedAt Spalte zur Subscription Tabelle hinzu
    await prisma.$executeRaw`
      ALTER TABLE "Subscription" 
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    `;

    // Setze updatedAt für alle bestehenden Einträge
    await prisma.$executeRaw`
      UPDATE "Subscription" 
      SET "updatedAt" = "createdAt" 
      WHERE "updatedAt" IS NULL
    `;

    // Mache updatedAt NOT NULL
    await prisma.$executeRaw`
      ALTER TABLE "Subscription" 
      ALTER COLUMN "updatedAt" SET NOT NULL
    `;

    return NextResponse.json({ 
      ok: true, 
      message: "Subscription table updated successfully" 
    });

  } catch (error) {
    console.error("Error fixing subscription table:", error);
    return NextResponse.json(
      { error: "Failed to fix subscription table" },
      { status: 500 }
    );
  }
}
