// app/api/admin/create-admin/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdminMaintenanceJson } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST() {
  try {
    const guard = await requireAdminMaintenanceJson();
    if (guard.response) return guard.response;

    const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || "info@ultima-rat.io";
    const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json({ error: "missing_admin_bootstrap_password" }, { status: 400 });
    }
    
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
          role: "admin",
          subscriptionStatus: "pro"
        }
      });

      return NextResponse.json({ 
        ok: true,
        message: "Admin user repaired successfully",
        email: adminEmail,
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
        emailVerifiedAt: new Date(),
        subscriptionStatus: "pro"
      }
    });

    return NextResponse.json({ 
      ok: true,
      message: "Admin user created successfully",
      email: adminEmail,
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
