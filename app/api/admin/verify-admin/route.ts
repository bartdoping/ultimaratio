// app/api/admin/verify-admin/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export const runtime = "nodejs"

// POST: Admin-User verifizieren
export async function POST() {
  try {
    const adminEmail = 'info@ultima-rat.io'
    
    const user = await prisma.user.findUnique({
      where: { email: adminEmail }
    })
    
    if (!user) {
      return NextResponse.json({ error: "admin_not_found" }, { status: 404 })
    }
    
    if (!user.emailVerifiedAt) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { emailVerifiedAt: new Date() }
      })
      
      return NextResponse.json({ 
        ok: true, 
        message: "Admin-User erfolgreich verifiziert!",
        user: {
          email: user.email,
          name: user.name,
          surname: user.surname,
          role: user.role
        }
      })
    } else {
      return NextResponse.json({ 
        ok: true, 
        message: "Admin-User bereits verifiziert!",
        user: {
          email: user.email,
          name: user.name,
          surname: user.surname,
          role: user.role,
          emailVerifiedAt: user.emailVerifiedAt
        }
      })
    }
  } catch (error) {
    console.error("Error verifying admin:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
