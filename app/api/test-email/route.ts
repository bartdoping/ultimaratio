import { NextResponse } from "next/server"
import { sendMail } from "@/lib/mail"

export const runtime = "nodejs"

export async function GET() {
  try {
    console.log("🧪 TESTING EMAIL SENDING...")
    
    await sendMail({
      to: "test@example.com",
      subject: "Test Email von fragenkreuzen.de",
      text: "Das ist eine Test-Email um die SMTP-Konfiguration zu prüfen.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>Das ist eine Test-Email um die SMTP-Konfiguration zu prüfen.</p>
          <p><strong>Zeit:</strong> ${new Date().toISOString()}</p>
        </div>
      `
    })
    
    return NextResponse.json({ 
      ok: true, 
      message: "Test email sent successfully",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("❌ TEST EMAIL FAILED:", error)
    return NextResponse.json({ 
      ok: false, 
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
