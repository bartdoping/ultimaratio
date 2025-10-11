// app/api/admin/seed-test-user/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const testEmail = "test@fragenkreuzen.de";
    const testPassword = "test123456";
    
    // Prüfe ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (existingUser) {
      return NextResponse.json({ 
        ok: true, 
        message: "Test user already exists",
        email: testEmail,
        password: testPassword,
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
        subscriptionStatus: "free",
        emailVerifiedAt: new Date() // Sofort verifiziert
      }
    });

    return NextResponse.json({ 
      ok: true, 
      message: "Test user created successfully",
      email: testEmail,
      password: testPassword,
      userId: user.id,
      emailVerified: true
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
