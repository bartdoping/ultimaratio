import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { extendBonus, getProAccess } from "@/lib/subscription"
import { getGeneratorDayKey } from "@/lib/generator-limits"
import { track } from "@/lib/product-events"

export const dynamic = "force-dynamic"

/**
 * Nutzer finden und Support leisten: Woher kommt Pro? Was hat er heute
 * verbraucht? Plus die häufigsten Eingriffe (Kulanz-Pro, Sitzungen beenden,
 * Kontingent zurücksetzen). Jeder Eingriff wird als "admin_action" protokolliert.
 */

async function adminId(): Promise<string> {
  const session = await getServerSession(authOptions)
  const u = session?.user as { role?: string; id?: string } | undefined
  if (u?.role !== "admin") redirect("/")
  return u.id ?? "admin"
}

function protokoll(admin: string, userId: string, aktion: string) {
  track("admin_action", { userId, props: { aktion, admin: admin.slice(-8) } })
}

async function proGutschreiben(form: FormData) {
  "use server"
  const admin = await adminId()
  const id = String(form.get("id") ?? "")
  const tage = Math.min(366, Math.max(1, Number(form.get("tage")) || 30))
  const u = await prisma.user.findUnique({ where: { id }, select: { proBonusUntil: true } })
  if (!u) return
  await prisma.user.update({ where: { id }, data: { proBonusUntil: extendBonus(u.proBonusUntil, tage) } })
  protokoll(admin, id, `pro_bonus_plus_${tage}`)
  revalidatePath("/admin/nutzer")
}

async function bonusEntfernen(form: FormData) {
  "use server"
  const admin = await adminId()
  const id = String(form.get("id") ?? "")
  await prisma.user.update({ where: { id }, data: { proBonusUntil: null } })
  protokoll(admin, id, "pro_bonus_entfernt")
  revalidatePath("/admin/nutzer")
}

async function sitzungenBeenden(form: FormData) {
  "use server"
  const admin = await adminId()
  const id = String(form.get("id") ?? "")
  await prisma.userSession.deleteMany({ where: { userId: id } })
  protokoll(admin, id, "sitzungen_beendet")
  revalidatePath("/admin/nutzer")
}

async function kontingentZuruecksetzen(form: FormData) {
  "use server"
  const admin = await adminId()
  const id = String(form.get("id") ?? "")
  await prisma.generatorDailyUsage.updateMany({
    where: { userId: id, dayKey: getGeneratorDayKey() },
    data: { count: 0, poolCount: 0, poolAnswerCount: 0 },
  })
  protokoll(admin, id, "kontingent_zurueckgesetzt")
  revalidatePath("/admin/nutzer")
}

async function erinnerungenAus(form: FormData) {
  "use server"
  const admin = await adminId()
  const id = String(form.get("id") ?? "")
  await prisma.user.update({ where: { id }, data: { reminderOptIn: false } })
  await prisma.pushSubscription.deleteMany({ where: { userId: id } })
  protokoll(admin, id, "erinnerungen_aus")
  revalidatePath("/admin/nutzer")
}

function datum(d: Date | null | undefined): string {
  return d ? d.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function NutzerPage({ searchParams }: { searchParams: Promise<{ q?: string; id?: string }> }) {
  await adminId()
  const { q = "", id } = await searchParams
  const suche = q.trim().toLowerCase()

  const treffer = suche.length >= 3
    ? await prisma.user.findMany({
        where: { email: { contains: suche, mode: "insensitive" } },
        select: { id: true, email: true, createdAt: true, subscriptionStatus: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : []
  const gewaehltId = id ?? (treffer.length === 1 ? treffer[0].id : null)

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Nutzer</h1>
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="E-Mail (mind. 3 Zeichen)"
          className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3"
        />
        <button className="h-10 rounded-lg bg-primary px-4 font-medium text-primary-foreground">Suchen</button>
      </form>

      {suche.length >= 3 && treffer.length === 0 && <p className="text-sm text-muted-foreground">Kein Treffer.</p>}
      {treffer.length > 1 && (
        <ul className="divide-y rounded-2xl border bg-card text-sm">
          {treffer.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/nutzer?q=${encodeURIComponent(q)}&id=${t.id}`} className="flex justify-between gap-3 px-4 py-2.5 hover:bg-muted/50">
                <span className="truncate">{t.email}</span>
                <span className="shrink-0 text-muted-foreground">
                  {t.subscriptionStatus === "pro" ? "Pro-Abo · " : ""}seit {t.createdAt.toLocaleDateString("de-DE")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {gewaehltId && <Detail id={gewaehltId} />}
    </div>
  )
}

async function Detail({ id }: { id: string }) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerifiedAt: true,
      subscriptionStatus: true,
      proBonusUntil: true,
      proTrialStartedAt: true,
      proTrialEndsAt: true,
      reminderOptIn: true,
      referralCode: true,
      examTarget: true,
      creatorCode: { select: { code: true } },
      subscription: { select: { stripeCustomerId: true, stripeSubscriptionId: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, status: true } },
    },
  })
  if (!u) return <p className="text-sm text-muted-foreground">Nutzer nicht gefunden.</p>

  const heute = getGeneratorDayKey()
  const [zugang, verbrauch, sitzungen, antworten, gespeichert, eingeladen, belohnt, pushGeraete, aktionen] = await Promise.all([
    getProAccess(u.id),
    prisma.generatorDailyUsage.findUnique({ where: { userId_dayKey: { userId: u.id, dayKey: heute } } }),
    prisma.userSession.findMany({ where: { userId: u.id }, orderBy: { lastSeenAt: "desc" }, select: { createdAt: true, lastSeenAt: true } }),
    prisma.poolAnswer.count({ where: { userId: u.id } }),
    prisma.savedQuestion.count({ where: { userId: u.id } }),
    prisma.user.count({ where: { referredById: u.id } }),
    prisma.user.count({ where: { referredById: u.id, referralRewardedAt: { not: null } } }),
    prisma.pushSubscription.count({ where: { userId: u.id } }),
    prisma.productEvent.findMany({ where: { userId: u.id, name: "admin_action" }, orderBy: { createdAt: "desc" }, take: 8, select: { createdAt: true, props: true } }),
  ])

  const quelle = { subscription: "Abo", trial: "Testphase", bonus: "Pass / Bonus", admin: "Admin", none: "kein Pro" }[zugang.kind]
  const felder: [string, string][] = [
    ["E-Mail", u.email],
    ["Registriert", `${datum(u.createdAt)}${u.emailVerifiedAt ? " · bestätigt" : " · NICHT bestätigt"}`],
    ["Pro", zugang.isPro ? `ja — ${quelle}` : "nein"],
    [
      "Abo (Stripe)",
      u.subscription?.stripeSubscriptionId
        ? `${u.subscription.status}${u.subscription.cancelAtPeriodEnd ? " · gekündigt" : ""} · bis ${datum(u.subscription.currentPeriodEnd)}`
        : "—",
    ],
    ["Pass / Bonus bis", datum(u.proBonusUntil)],
    ["Testphase", u.proTrialStartedAt ? `bis ${datum(u.proTrialEndsAt)}` : "nicht genutzt"],
    ["Heute verbraucht", verbrauch ? `${verbrauch.poolAnswerCount} Fragen · ${verbrauch.count} Generierungen` : "nichts"],
    ["Antworten gesamt / gespeichert", `${antworten} / ${gespeichert}`],
    ["Sitzungen", sitzungen.length ? sitzungen.map((s) => `zuletzt ${datum(s.lastSeenAt)}`).join(" · ") : "keine registriert"],
    ["Erinnerungen", `${u.reminderOptIn ? "an" : "aus"} · ${pushGeraete} Push-Gerät(e)`],
    ["Einladungen", `${u.referralCode ?? "—"} · ${eingeladen} eingeladen · ${belohnt} belohnt`],
    ["Creator-Code / Ziel", `${u.creatorCode?.code ?? "—"} / ${u.examTarget ?? "—"}`],
  ]

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[12rem_1fr]">
        {felder.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-all">{v}</dd>
          </div>
        ))}
      </dl>

      {u.subscription?.stripeCustomerId && (
        <a
          href={`https://dashboard.stripe.com/customers/${u.subscription.stripeCustomerId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm underline"
        >
          In Stripe öffnen (Zahlungen, Erstattung, Abo kündigen)
        </a>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {[7, 30].map((t) => (
          <form key={t} action={proGutschreiben}>
            <input type="hidden" name="id" value={u.id} />
            <input type="hidden" name="tage" value={t} />
            <button className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">+{t} Tage Pro</button>
          </form>
        ))}
        {u.proBonusUntil && (
          <form action={bonusEntfernen}>
            <input type="hidden" name="id" value={u.id} />
            <button className="h-9 rounded-full border border-red-500/40 px-4 text-sm text-red-700 hover:bg-red-500/10 dark:text-red-300">Pass/Bonus entfernen</button>
          </form>
        )}
        <form action={kontingentZuruecksetzen}>
          <input type="hidden" name="id" value={u.id} />
          <button className="h-9 rounded-full border px-4 text-sm hover:bg-muted">Kontingent heute zurücksetzen</button>
        </form>
        <form action={sitzungenBeenden}>
          <input type="hidden" name="id" value={u.id} />
          <button className="h-9 rounded-full border px-4 text-sm hover:bg-muted">Alle Sitzungen beenden</button>
        </form>
        {u.reminderOptIn && (
          <form action={erinnerungenAus}>
            <input type="hidden" name="id" value={u.id} />
            <button className="h-9 rounded-full border px-4 text-sm hover:bg-muted">Erinnerungen aus</button>
          </form>
        )}
      </div>

      {aktionen.length > 0 && (
        <div className="border-t pt-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium">Admin-Eingriffe</div>
          {aktionen.map((a, i) => (
            <div key={i}>
              {datum(a.createdAt)}: {String((a.props as { aktion?: string } | null)?.aktion ?? "")}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
