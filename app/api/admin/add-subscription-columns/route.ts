// app/api/admin/add-subscription-columns/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("Adding subscription columns to database...");
    
    // Füge subscriptionStatus Spalte hinzu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "subscriptionStatus" text DEFAULT 'free'
    `);
    
    // Füge subscriptionId Spalte hinzu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "subscriptionId" text
    `);
    
    // Füge subscriptionExpiresAt Spalte hinzu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" timestamptz
    `);
    
    // Füge dailyQuestionsUsed Spalte hinzu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "dailyQuestionsUsed" integer DEFAULT 0
    `);
    
    // Füge lastQuestionResetAt Spalte hinzu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "lastQuestionResetAt" timestamptz DEFAULT now()
    `);
    
    // Füge status Spalte zur Subscription Tabelle hinzu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Subscription" 
      ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'free'
    `);
    
    // Erstelle Index für subscriptionId
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_subscriptionId_key" ON "User"("subscriptionId")
    `);
    
    console.log("Subscription columns added successfully");
    
    return NextResponse.json({ 
      ok: true,
      message: "Subscription columns added successfully"
    });
  } catch (error) {
    console.error("Error adding subscription columns:", error);
    return NextResponse.json({ 
      ok: false,
      error: "Failed to add subscription columns",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
