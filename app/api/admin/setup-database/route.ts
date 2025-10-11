// app/api/admin/setup-database/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("Setting up database with subscription features...");
    
    // 1. Füge User-Spalten hinzu
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "subscriptionStatus" text DEFAULT 'free'
    `);
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "subscriptionId" text
    `);
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" timestamptz
    `);
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "dailyQuestionsUsed" integer DEFAULT 0
    `);
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "lastQuestionResetAt" timestamptz DEFAULT now()
    `);
    
    // 2. Erstelle Subscription Tabelle (einfacher Ansatz)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Subscription" (
        "id" text PRIMARY KEY,
        "userId" text UNIQUE,
        "stripeCustomerId" text,
        "stripeSubscriptionId" text,
        "status" text DEFAULT 'free',
        "priceId" text,
        "currentPeriodStart" timestamptz,
        "currentPeriodEnd" timestamptz,
        "cancelAtPeriodEnd" boolean DEFAULT false,
        "createdAt" timestamptz DEFAULT now()
      )
    `);
    
    // 3. Erstelle Indizes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_subscriptionId_key" ON "User"("subscriptionId")
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId")
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId")
    `);
    
    console.log("Database setup completed successfully");
    
    return NextResponse.json({ 
      ok: true,
      message: "Database setup completed successfully"
    });
  } catch (error) {
    console.error("Error setting up database:", error);
    return NextResponse.json({ 
      ok: false,
      error: "Failed to setup database",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
