// app/api/admin/create-test-user-direct/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST() {
  try {
    const testEmail = "test@fragenkreuzen.de";
    const testPassword = "test123456";
    
    // Prüfe ob Test-User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (existingUser) {
      return NextResponse.json({ 
        ok: true,
        message: "Test user already exists",
        email: testEmail,
        password: testPassword
      });
    }

    // Erstelle Test-User
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test",
        surname: "User",
        passwordHash: hashedPassword,
        role: "user",
        emailVerifiedAt: new Date(),
        subscriptionStatus: "free"
      }
    });

    return NextResponse.json({ 
      ok: true,
      message: "Test user created successfully",
      email: testEmail,
      password: testPassword,
      userId: testUser.id
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json({ 
      error: "server_error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
