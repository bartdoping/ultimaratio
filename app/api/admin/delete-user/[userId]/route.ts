// app/api/admin/delete-user/[userId]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Nur Admins dürfen das
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || 
        (session.user.email !== "info@ultima-rat.io" && session.user.email !== "admin@fragenkreuzen.de")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = params

    // Prüfe ob User existiert
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        role: true,
        name: true,
        surname: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 })
    }

    // Verhindere Löschung von Admins
    if (user.role === "admin") {
      return NextResponse.json({ 
        error: "Admin-User können nicht gelöscht werden" 
      }, { status: 400 })
    }

    console.log(`Deleting user: ${user.email} (${user.name} ${user.surname})`)

    // Lösche User (Cascade löscht alle zugehörigen Daten)
    await prisma.user.delete({
      where: { id: userId }
    })

    console.log(`User successfully deleted: ${user.email}`)

    return NextResponse.json({ 
      ok: true, 
      message: `User "${user.email}" erfolgreich gelöscht`,
      deletedUser: {
        email: user.email,
        name: user.name,
        surname: user.surname
      }
    })

  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ 
      error: `User-Löschung fehlgeschlagen: ${error instanceof Error ? error.message : "Unbekannter Fehler"}` 
    }, { status: 500 })
  }
}
