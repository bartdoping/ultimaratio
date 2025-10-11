// app/api/admin/create-admin/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST() {
  try {
    const adminEmail = "info@ultima-rat.io";
    const adminPassword = "admin123456"; // Temporäres Passwort
    
    // Prüfe ob Admin bereits existiert
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      // Repariere existierenden Admin
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const updatedAdmin = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash: hashedPassword,
          emailVerifiedAt: new Date(),
          role: "admin"
        }
      });

      return NextResponse.json({ 
        ok: true,
        message: "Admin user repaired successfully",
        email: adminEmail,
        password: adminPassword,
        role: updatedAdmin.role,
        emailVerified: !!updatedAdmin.emailVerifiedAt
      });
    }

    // Erstelle neuen Admin (ohne neue Spalten)
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        surname: "User",
        passwordHash: hashedPassword,
        role: "admin",
        emailVerifiedAt: new Date()
      }
    });

    return NextResponse.json({ 
      ok: true,
      message: "Admin user created successfully",
      email: adminEmail,
      password: adminPassword,
      role: newAdmin.role,
      emailVerified: !!newAdmin.emailVerifiedAt
    });
  } catch (error) {
    console.error("Error creating/fixing admin user:", error);
    return NextResponse.json({ 
      error: "server_error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
