import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { beendeStripeAbos } from "@/lib/stripe-abo-beenden"

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

    // 4) Laufende Stripe-Abos beenden — sonst bucht Stripe ohne Konto weiter ab.
    //    Scheitert das, wird das Konto bewusst NICHT gelöscht.
    const abo = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    })
    if (abo) {
      try {
        await beendeStripeAbos(abo)
      } catch (e) {
        console.error("account deletion: Stripe-Kündigung fehlgeschlagen", (e as Error)?.message?.slice(0, 200))
        return NextResponse.json(
          {
            ok: false,
            error: "Dein Abo konnte gerade nicht beendet werden. Dein Konto wurde nicht gelöscht — bitte versuche es gleich noch einmal.",
          },
          { status: 502 }
        )
      }
    }

    // 5) Vollständige Account-Löschung. Die Abo-Zeile explizit mitlöschen:
    //    In Production fehlt der Fremdschlüssel, Cascade greift dort nicht.
    await prisma.$transaction([
      prisma.subscription.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ])

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
