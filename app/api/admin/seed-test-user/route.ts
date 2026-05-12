// app/api/admin/seed-test-user/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdminMaintenanceJson } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST() {
  try {
    const guard = await requireAdminMaintenanceJson();
    if (guard.response) return guard.response;

    const testEmail = process.env.TEST_USER_EMAIL || "test@fragenkreuzen.de";
    const testPassword = process.env.TEST_USER_PASSWORD;
    if (!testPassword) {
      return NextResponse.json({ error: "missing_test_user_password" }, { status: 400 });
    }
    
    // Prüfe ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (existingUser) {
      return NextResponse.json({ 
        ok: true, 
        message: "Test user already exists",
        email: testEmail,
        userId: existingUser.id
      });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    // User erstellen
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test",
        surname: "User",
        passwordHash: hashedPassword,
        role: "user",
        // subscriptionStatus: "free",
        emailVerifiedAt: new Date() // Sofort verifiziert
      }
    });

    return NextResponse.json({ 
      ok: true, 
      message: "Test user created successfully",
      email: testEmail,
      userId: user.id,
      emailVerified: true
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
