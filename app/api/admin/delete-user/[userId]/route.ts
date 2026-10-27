// app/api/admin/delete-user/[userId]/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireAdminJson } from "@/lib/authz"
import { beendeStripeAbos } from "@/lib/stripe-abo-beenden"

export const runtime = "nodejs"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    const { userId } = await params

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

    // Laufende Stripe-Abos beenden — sonst bucht Stripe ohne Konto weiter ab.
    const abo = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    })
    if (abo) {
      try {
        await beendeStripeAbos(abo)
      } catch (e) {
        return NextResponse.json(
          { error: `Stripe-Abo konnte nicht beendet werden, User nicht gelöscht: ${(e as Error)?.message?.slice(0, 200)}` },
          { status: 502 }
        )
      }
    }

    // Lösche User (Cascade löscht alle zugehörigen Daten). Abo-Zeile explizit,
    // weil in Production der Fremdschlüssel fehlt.
    await prisma.$transaction([
      prisma.subscription.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ])

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
