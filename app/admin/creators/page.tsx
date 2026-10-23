import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { normalizeCode } from "@/lib/referral"
import { getAppBaseUrl } from "@/lib/app-base-url"

export const dynamic = "force-dynamic"

/**
 * Creator-Codes: Medfluencer bekommen einen eigenen Link (/r/CODE).
 * Registrierungen werden zugeordnet; die Provision auf zahlende Nutzer wird
 * manuell abgerechnet — die Tabelle liefert die Zahlen dafür.
 */

async function nurAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/")
}

async function anlegen(form: FormData) {
  "use server"
  await nurAdmin()
  const code = normalizeCode(String(form.get("code") ?? ""))
  const name = String(form.get("name") ?? "").trim().slice(0, 100)
  const email = String(form.get("email") ?? "").trim().slice(0, 254) || null
  const prozent = Math.min(100, Math.max(0, Math.round(Number(form.get("prozent")) || 20)))
  if (!code || !name) return
  // Darf nicht mit einem Einladungs-Code eines Nutzers kollidieren.
  const belegt = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
  if (belegt) return
  await prisma.creatorCode.create({ data: { code, name, email, commissionPercent: prozent } }).catch(() => null)
  revalidatePath("/admin/creators")
}

async function umschalten(form: FormData) {
  "use server"
  await nurAdmin()
  const id = String(form.get("id") ?? "")
  const c = await prisma.creatorCode.findUnique({ where: { id }, select: { active: true } })
  if (c) await prisma.creatorCode.update({ where: { id }, data: { active: !c.active } })
  revalidatePath("/admin/creators")
}

export default async function CreatorsPage() {
  await nurAdmin()
  const codes = await prisma.creatorCode.findMany({ orderBy: { createdAt: "desc" } })
  const [anmeldungen, zahlend] = await Promise.all([
    prisma.user.groupBy({ by: ["creatorCodeId"], where: { creatorCodeId: { not: null } }, _count: { _all: true } }),
    prisma.user.groupBy({
      by: ["creatorCodeId"],
      where: { creatorCodeId: { not: null }, subscriptionStatus: "pro" },
      _count: { _all: true },
    }),
  ])
  const zahl = (rows: typeof anmeldungen, id: string) => rows.find((r) => r.creatorCodeId === id)?._count._all ?? 0
  const base = getAppBaseUrl()

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Creator-Codes</h1>

      <form action={anlegen} className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-5">
        <input name="code" required placeholder="CODE" className="h-10 rounded-md border bg-background px-3 uppercase" />
        <input name="name" required placeholder="Name" className="h-10 rounded-md border bg-background px-3" />
        <input name="email" type="email" placeholder="E-Mail (optional)" className="h-10 rounded-md border bg-background px-3" />
        <input name="prozent" type="number" min={0} max={100} defaultValue={20} className="h-10 rounded-md border bg-background px-3" aria-label="Provision in Prozent" />
        <button className="h-10 rounded-md bg-primary font-medium text-primary-foreground">Anlegen</button>
      </form>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3 text-right">Anmeldungen</th>
              <th className="p-3 text-right">Zahlend</th>
              <th className="p-3 text-right">Provision</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">
                  {c.code}
                  <div className="text-xs text-muted-foreground">{`${base}/r/${c.code}`}</div>
                </td>
                <td className="p-3">
                  {c.name}
                  {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                </td>
                <td className="p-3 text-right tabular-nums">{zahl(anmeldungen, c.id)}</td>
                <td className="p-3 text-right tabular-nums">{zahl(zahlend, c.id)}</td>
                <td className="p-3 text-right tabular-nums">{c.commissionPercent} %</td>
                <td className="p-3 text-right">
                  <form action={umschalten}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded-md border px-2 py-1 text-xs">{c.active ? "Deaktivieren" : "Aktivieren"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Noch keine Creator-Codes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
