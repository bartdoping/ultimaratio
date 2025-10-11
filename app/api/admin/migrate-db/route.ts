// app/api/admin/migrate-db/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("Starting database migration...");
    
    // Führe Prisma DB Push aus
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
      console.log("Migration output:", stdout);
      if (stderr) console.log("Migration errors:", stderr);
      
      return NextResponse.json({ 
        ok: true,
        message: "Database migration completed successfully",
        output: stdout,
        errors: stderr
      });
    } catch (execError) {
      console.error("Migration execution error:", execError);
      return NextResponse.json({ 
        ok: false,
        error: "Migration failed",
        details: execError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error running migration:", error);
    return NextResponse.json({ 
      error: "server_error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
