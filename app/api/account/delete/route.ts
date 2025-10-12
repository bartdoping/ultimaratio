import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function DELETE() {
  try {
    // 1) Auth
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    // 2) User finden
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        email: true,
        role: true
      }
    })

    if (!user) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 })
    }

    // 3) Admin-User können sich nicht selbst löschen
    if (user.role === "admin") {
      return NextResponse.json({ 
        ok: false, 
        error: "Admin-Accounts können nicht gelöscht werden" 
      }, { status: 403 })
    }

    console.log(`Deleting account for user: ${user.email} (${user.id})`)

    // 4) Vollständige Account-Löschung
    // Da wir CASCADE DELETE in der Prisma-Schema haben, werden alle verknüpften Daten automatisch gelöscht
    await prisma.user.delete({
      where: { id: user.id }
    })

    console.log(`Account successfully deleted for user: ${user.email}`)

    return NextResponse.json({ 
      ok: true, 
      message: "Account wurde vollständig gelöscht"
    })

  } catch (err: any) {
    console.error("account deletion error", err)
    return NextResponse.json({ 
      ok: false, 
      error: `Account-Löschung fehlgeschlagen: ${err.message || "Unbekannter Fehler"}` 
    }, { status: 500 })
  }
}
