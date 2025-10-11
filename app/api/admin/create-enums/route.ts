// app/api/admin/create-enums/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("Creating database enums...");
    
    // Erstelle SubscriptionStatus enum
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('free', 'pro');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Erstelle Role enum falls nicht vorhanden
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Erstelle QuestionType enum falls nicht vorhanden
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "QuestionType" AS ENUM ('single');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    console.log("Database enums created successfully");
    
    return NextResponse.json({ 
      ok: true,
      message: "Database enums created successfully"
    });
  } catch (error) {
    console.error("Error creating enums:", error);
    return NextResponse.json({ 
      ok: false,
      error: "Failed to create enums",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
