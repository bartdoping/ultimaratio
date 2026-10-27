import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { aboLaeuftNoch, beendeStripeAbos } from "@/lib/stripe-abo-beenden"
import { track } from "@/lib/product-events"

export const dynamic = "force-dynamic"

/**
 * Stripe-Abgleich: alles, wo Datenbank und Stripe auseinanderlaufen können.
 *
 * - Verwaiste Abos: Abo-Zeile ohne Konto (Konto gelöscht, Abo blieb liegen).
 *   Der Live-Status kommt direkt von Stripe — läuft eins noch, bucht Stripe
 *   ohne Gegenleistung ab und muss sofort beendet werden.
 * - Hängende Webhooks: Ereignisse, deren Verarbeitung nie fertig wurde.
 */

async function adminId(): Promise<string> {
  const session = await getServerSession(authOptions)
  const u = session?.user as { role?: string; id?: string } | undefined
  if (u?.role !== "admin") redirect("/")
  return u.id ?? "admin"
}

type Verwaist = {
  id: string
  userId: string
  status: string
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  currentPeriodEnd: Date | null
  createdAt: Date | null
}

async function verwaisteAbos(): Promise<Verwaist[]> {
  // Kein Prisma-Relationsfilter: In Production fehlt der Fremdschlüssel,
  // die Relation liefert für solche Zeilen einen Fehler statt null.
  return prisma.$queryRaw<Verwaist[]>`
    SELECT s."id", s."userId", s."status"::text AS "status", s."stripeSubscriptionId", s."stripeCustomerId",
           s."currentPeriodEnd", s."createdAt"
    FROM "Subscription" s LEFT JOIN "User" u ON u."id" = s."userId"
    WHERE u."id" IS NULL
    ORDER BY s."createdAt" DESC NULLS LAST`
}

async function liveStatus(v: Verwaist): Promise<{ text: string; laeuft: boolean }> {
  try {
    if (v.stripeSubscriptionId) {
      const s = await stripe.subscriptions.retrieve(v.stripeSubscriptionId)
      return { text: s.status, laeuft: aboLaeuftNoch(s.status) }
    }
    if (v.stripeCustomerId) {
      const l = await stripe.subscriptions.list({ customer: v.stripeCustomerId, status: "all", limit: 20 })
      const laufend = l.data.filter((s) => aboLaeuftNoch(s.status))
      return laufend.length
        ? { text: laufend.map((s) => s.status).join(", "), laeuft: true }
        : { text: l.data.length ? "alle beendet" : "kein Abo", laeuft: false }
    }
    return { text: "keine Stripe-ID", laeuft: false }
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === "resource_missing") return { text: "bei Stripe unbekannt", laeuft: false }
    return { text: `Fehler: ${(e as Error)?.message?.slice(0, 80)}`, laeuft: false }
  }
}

async function bereinigen(form: FormData) {
  "use server"
  const admin = await adminId()
  const id = String(form.get("id") ?? "")
  const [v] = (await verwaisteAbos()).filter((r) => r.id === id)
  if (!v) return
  const beendet = await beendeStripeAbos(v)
  await prisma.subscription.delete({ where: { id } })
  track("admin_action", { props: { aktion: "verwaistes_abo_bereinigt", beendet, admin: admin.slice(-8) } })
  revalidatePath("/admin/stripe")
}

async function alleBereinigen() {
  "use server"
  const admin = await adminId()
  let beendet = 0
  for (const v of await verwaisteAbos()) {
    beendet += await beendeStripeAbos(v)
    await prisma.subscription.delete({ where: { id: v.id } })
  }
  track("admin_action", { props: { aktion: "verwaiste_abos_bereinigt", beendet, admin: admin.slice(-8) } })
  revalidatePath("/admin/stripe")
}

async function alsErledigt(form: FormData) {
  "use server"
  const admin = await adminId()
  const id = String(form.get("id") ?? "")
  const where = id === "alle" ? { processedAt: null, receivedAt: { lt: new Date(Date.now() - 10 * 60_000) } } : { eventId: id }
  const r = await prisma.stripeEventLog.updateMany({ where, data: { processedAt: new Date() } })
  track("admin_action", { props: { aktion: "webhook_als_erledigt", anzahl: r.count, admin: admin.slice(-8) } })
  revalidatePath("/admin/stripe")
}

const datum = (d: Date | null) => (d ? d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : "–")
const kurz = (s: string | null) => (s ? `…${s.slice(-8)}` : "–")

export default async function StripeAbgleichPage() {
  await adminId()

  const [verwaist, haengend] = await Promise.all([
    verwaisteAbos(),
    prisma.stripeEventLog.findMany({
      where: { processedAt: null, receivedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
  ])
  const mitStatus = await Promise.all(verwaist.map(async (v) => ({ ...v, live: await liveStatus(v) })))
  const laufend = mitStatus.filter((v) => v.live.laeuft).length

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/admin/system" className="text-sm text-muted-foreground hover:underline">← Systemstatus</Link>
        <h1 className="mt-1 text-2xl font-semibold">Stripe-Abgleich</h1>
        <p className="text-sm text-muted-foreground">Wo Datenbank und Stripe auseinanderlaufen — mit Live-Status von Stripe.</p>
      </div>

      <section className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">Verwaiste Abos ({verwaist.length})</h2>
          {verwaist.length > 0 && (
            <form action={alleBereinigen}>
              <button className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted">
                Alle bereinigen{laufend ? ` (${laufend} laufende beenden)` : ""}
              </button>
            </form>
          )}
        </div>
        {laufend > 0 && (
          <p className="border-b bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
            {laufend} Abo{laufend > 1 ? "s laufen" : " läuft"} bei Stripe weiter, obwohl das Konto gelöscht ist — Stripe bucht dort
            weiter ab. Bereinigen beendet das Abo sofort. Bereits abgebuchte Beträge prüfst du in Stripe unter Zahlungen und
            erstattest sie dort bei Bedarf.
          </p>
        )}
        {verwaist.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Keine — jede Abo-Zeile gehört zu einem Konto.</p>
        ) : (
          <ul className="divide-y">
            {mitStatus.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${v.live.laeuft ? "bg-red-500" : "bg-amber-500"}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    Stripe: {v.live.text}
                    <span className="font-normal text-muted-foreground"> · lokal {v.status} · bis {datum(v.currentPeriodEnd)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Abo{" "}
                    {v.stripeSubscriptionId ? (
                      <a className="underline" href={`https://dashboard.stripe.com/subscriptions/${v.stripeSubscriptionId}`} target="_blank" rel="noreferrer">
                        {kurz(v.stripeSubscriptionId)}
                      </a>
                    ) : (
                      "–"
                    )}{" "}
                    · Kunde{" "}
                    {v.stripeCustomerId ? (
                      <a className="underline" href={`https://dashboard.stripe.com/customers/${v.stripeCustomerId}`} target="_blank" rel="noreferrer">
                        {kurz(v.stripeCustomerId)}
                      </a>
                    ) : (
                      "–"
                    )}{" "}
                    · angelegt {datum(v.createdAt)}
                  </div>
                </div>
                <form action={bereinigen}>
                  <input type="hidden" name="id" value={v.id} />
                  <button className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted">
                    {v.live.laeuft ? "Abo beenden & entfernen" : "Eintrag entfernen"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">Hängende Webhooks ({haengend.length})</h2>
          {haengend.length > 0 && (
            <form action={alsErledigt}>
              <input type="hidden" name="id" value="alle" />
              <button className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted">Alle als erledigt markieren</button>
            </form>
          )}
        </div>
        <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">
          Angenommen, aber nie fertig verarbeitet. Stripe wiederholt ein Ereignis bis zu 3 Tage lang; danach nicht mehr.
          Vorher die Ursache prüfen (meist: Abo eines gelöschten Kontos — siehe oben), dann als erledigt markieren.
        </p>
        {haengend.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Keine.</p>
        ) : (
          <ul className="divide-y">
            {haengend.map((e) => (
              <li key={e.eventId} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{e.type}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {e.receivedAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} · {e.livemode ? "live" : "test"} ·{" "}
                    <a className="underline" href={`https://dashboard.stripe.com/${e.livemode ? "" : "test/"}events/${e.eventId}`} target="_blank" rel="noreferrer">
                      {kurz(e.eventId)}
                    </a>
                  </span>
                </div>
                <form action={alsErledigt}>
                  <input type="hidden" name="id" value={e.eventId} />
                  <button className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted">Erledigt</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
