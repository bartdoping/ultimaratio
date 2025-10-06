import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export const runtime = "nodejs"

export async function GET() {
  try {
    console.log("🧪 TESTING GMAIL SMTP...")
    
    // Gmail SMTP Test
    const transporter = nodemailer.createTransporter({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "test@gmail.com", // Dummy für Test
        pass: "dummy"
      },
      logger: true,
      debug: true
    })
    
    // Nur die Konfiguration testen, nicht senden
    const isConnected = await transporter.verify()
    
    return NextResponse.json({ 
      ok: true, 
      message: "Gmail SMTP configuration test",
      connected: isConnected,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("❌ GMAIL TEST FAILED:", error)
    return NextResponse.json({ 
      ok: false, 
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
