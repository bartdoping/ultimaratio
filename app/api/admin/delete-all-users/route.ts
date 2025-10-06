import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

// DELETE: Alle User außer Admin löschen
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  try {
    // Zähle zuerst alle User
    const totalUsers = await prisma.user.count()
    const adminUsers = await prisma.user.count({
      where: { email: "info@ultima-rat.io" }
    })

    // Lösche alle User außer dem Admin
    const deleteResult = await prisma.user.deleteMany({
      where: {
        email: {
          not: "info@ultima-rat.io"
        }
      }
    })

    return NextResponse.json({ 
      ok: true, 
      message: "Alle User außer Admin erfolgreich gelöscht",
      deleted: deleteResult.count,
      totalBefore: totalUsers,
      adminPreserved: adminUsers > 0
    })
  } catch (error) {
    console.error("Error deleting users:", error)
    return NextResponse.json({ 
      ok: false, 
      error: "server_error",
      message: "Fehler beim Löschen der User"
    }, { status: 500 })
  }
}
