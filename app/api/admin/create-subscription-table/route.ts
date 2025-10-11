// app/api/admin/create-subscription-table/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("Creating Subscription table...");
    
    // Erstelle Subscription Tabelle
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Subscription" (
        "id" text NOT NULL PRIMARY KEY,
        "userId" text NOT NULL UNIQUE,
        "stripeCustomerId" text UNIQUE,
        "stripeSubscriptionId" text UNIQUE,
        "status" text DEFAULT 'free',
        "priceId" text,
        "currentPeriodStart" timestamptz,
        "currentPeriodEnd" timestamptz,
        "cancelAtPeriodEnd" boolean DEFAULT false,
        "createdAt" timestamptz DEFAULT now()
      )
    `);
    
    // Erstelle Foreign Key Constraint
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Subscription" 
      ADD CONSTRAINT IF NOT EXISTS "Subscription_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);
    
    console.log("Subscription table created successfully");
    
    return NextResponse.json({ 
      ok: true,
      message: "Subscription table created successfully"
    });
  } catch (error) {
    console.error("Error creating subscription table:", error);
    return NextResponse.json({ 
      ok: false,
      error: "Failed to create subscription table",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
