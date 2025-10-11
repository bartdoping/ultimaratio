// app/api/admin/fix-admin/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST() {
  try {
    // Temporärer Bypass für Admin-Fix
    const adminEmail = "info@ultima-rat.io";
    
    // Prüfe ob Admin existiert
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true, role: true, emailVerifiedAt: true }
    });

    if (!admin) {
      return NextResponse.json({ 
        error: "Admin user not found",
        suggestion: "Create admin user manually"
      }, { status: 404 });
    }

    // Repariere Admin-User
    const updatedAdmin = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        emailVerifiedAt: new Date(), // Sofort verifiziert
        role: "admin",
        // subscriptionStatus: "pro" // Admin ist automatisch Pro
      }
    });

    return NextResponse.json({ 
      ok: true,
      message: "Admin user fixed successfully",
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        emailVerified: !!updatedAdmin.emailVerifiedAt,
        // subscriptionStatus: updatedAdmin.subscriptionStatus
      }
    });
  } catch (error) {
    console.error("Error fixing admin user:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
