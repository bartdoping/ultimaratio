import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { costPerQuestion, retention, summarizeCost } from "@/lib/metrics"

export const dynamic = "force-dynamic"

/**
 * Kennzahlen-Übersicht für Admins.
 *
 * Aggregiert wird in der Datenbank (groupBy / date_trunc), nicht im Speicher:
 * Bei wachsender Nutzung würde das Laden aller Rohzeilen die Seite sonst
 * unbrauchbar langsam machen.
 */

const TAGE = 30

type TagZeile = { tag: Date; name: string; n: bigint; nutzer: bigint }
type AktivZeile = { userId: string; tag: Date }
type StufeZeile = { difficulty: number; n: bigint; richtig: bigint; ms: number | null }

const usd = (v: number) =>
  v < 0.01 && v > 0 ? `${(v * 100).toFixed(3)} ¢` : `${v.toLocaleString("de-DE", { maximumFractionDigits: 2 })} $`
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`)

export default async function MetricsPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/")

  const seit = new Date(Date.now() - TAGE * 86_400_000)
  const seitRet = new Date(Date.now() - 60 * 86_400_000)

  const [usage, tage, aktiv, signups, pool, offeneMeldungen, stufen] = await Promise.all([
    prisma.aiUsageEvent.groupBy({
      by: ["model", "purpose"],
      where: { createdAt: { gte: seit } },
      _sum: { inputTokens: true, cachedTokens: true, outputTokens: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<TagZeile[]>`
      SELECT date_trunc('day', "createdAt") AS tag, name,
             COUNT(*)::bigint AS n, COUNT(DISTINCT "userId")::bigint AS nutzer
      FROM "ProductEvent" WHERE "createdAt" >= ${seit}
      GROUP BY 1, 2 ORDER BY 1`,
    prisma.$queryRaw<AktivZeile[]>`
      SELECT DISTINCT "userId", date_trunc('day', "createdAt") AS tag
      FROM "ProductEvent" WHERE "userId" IS NOT NULL AND "createdAt" >= ${seitRet}`,
    prisma.user.findMany({ where: { createdAt: { gte: seitRet } }, select: { id: true, createdAt: true } }),
    prisma.poolQuestion.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.poolQuestion.count({ where: { status: "active", reportCount: { gt: 0 } } }),
    // Trefferquote je Stufe: Belegt, ob die Stufen wirklich unterschiedlich schwer sind.
    prisma.$queryRaw<StufeZeile[]>`
      SELECT q.difficulty, COUNT(*)::bigint AS n,
             SUM(CASE WHEN a.correct THEN 1 ELSE 0 END)::bigint AS richtig,
             AVG(a."msToAnswer")::float AS ms
      FROM "PoolAnswer" a JOIN "PoolQuestion" q ON q.id = a."poolQuestionId"
      WHERE a."createdAt" >= ${seit}
      GROUP BY q.difficulty ORDER BY q.difficulty`,
  ])

  // ---- Kosten ----
  const rows = usage.map((u) => ({
    createdAt: new Date(),
    purpose: u.purpose,
    model: u.model,
    inputTokens: u._sum.inputTokens ?? 0,
    cachedTokens: u._sum.cachedTokens ?? 0,
    outputTokens: u._sum.outputTokens ?? 0,
    userId: null,
  }))
  const kosten = summarizeCost(rows)
  const calls = usage.reduce((s, u) => s + u._count._all, 0)

  const summe = (name: string) => tage.filter((t) => t.name === name).reduce((s, t) => s + Number(t.n), 0)
  const served = summe("question_served")
  const beantwortet = summe("question_answered")
  const proFrage = costPerQuestion(kosten.usd, served)

  // ---- Retention ----
  const ret = retention(
    signups.map((s) => ({ userId: s.id, at: s.createdAt })),
    aktiv.map((a) => ({ userId: a.userId, at: new Date(a.tag) })),
    [1, 7, 30]
  )

  // ---- Tagesreihe ----
  const tagesKeys = [...new Set(tage.map((t) => new Date(t.tag).toISOString().slice(0, 10)))].sort().reverse()
  const wert = (tag: string, name: string, feld: "n" | "nutzer" = "n") =>
    Number(tage.find((t) => new Date(t.tag).toISOString().slice(0, 10) === tag && t.name === name)?.[feld] ?? 0)
  const aktivAmTag = (tag: string) =>
    new Set(aktiv.filter((a) => new Date(a.tag).toISOString().slice(0, 10) === tag).map((a) => a.userId)).size

  const kachel = (titel: string, wertText: string, hinweis?: string) => (
    <div className="material rounded-2xl p-4">
      <div className="text-xs text-muted-foreground">{titel}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{wertText}</div>
      {hinweis && <div className="mt-1 text-xs text-muted-foreground">{hinweis}</div>}
    </div>
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Kennzahlen</h1>
        <p className="text-sm text-muted-foreground">Letzte {TAGE} Tage · Retention über Registrierungen der letzten 60 Tage</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kachel("Fragen ausgeliefert", served.toLocaleString("de-DE"))}
        {kachel("Fragen beantwortet", beantwortet.toLocaleString("de-DE"))}
        {kachel("KI-Kosten", usd(kosten.usd), kosten.callsOhnePreis ? `+ ${kosten.callsOhnePreis} Aufrufe ohne Preis` : `${calls} Aufrufe`)}
        {kachel("Kosten pro Frage", proFrage === null ? "—" : usd(proFrage))}
        {kachel("Retention D1", pct(ret[1].quote), `Basis ${ret[1].basis}`)}
        {kachel("Retention D7", pct(ret[7].quote), `Basis ${ret[7].basis}`)}
        {kachel("Retention D30", pct(ret[30].quote), `Basis ${ret[30].basis}`)}
        {kachel(
          "Registrierung → Abo",
          summe("signup") ? pct(summe("subscription_started") / summe("signup")) : "—",
          `${summe("subscription_started")} Abos · ${summe("subscription_canceled")} gekündigt`
        )}
      </section>

      {kosten.modelleOhnePreis.length > 0 && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Kein Preis hinterlegt für: <strong>{kosten.modelleOhnePreis.join(", ")}</strong>. Diese Aufrufe fehlen in den
          Kosten. In Vercel <code>AI_PRICES_JSON</code> setzen, z. B.{" "}
          <code>{'{"gpt-5.6-terra":{"input":…,"cached":…,"output":…}}'}</code> (USD je 1 Mio. Tokens).
        </p>
      )}

      <section className="material overflow-x-auto rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-semibold">Kosten nach Zweck</h2>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="py-1">Zweck</th><th>Aufrufe</th><th>Output-Tokens</th><th>Kosten</th></tr>
          </thead>
          <tbody>
            {Object.entries(kosten.nachZweck).sort((a, b) => b[1].usd - a[1].usd).map(([zweck, z]) => (
              <tr key={zweck} className="border-t">
                <td className="py-1">{zweck}</td>
                <td>{usage.filter((u) => u.purpose === zweck).reduce((s, u) => s + u._count._all, 0)}</td>
                <td>{z.outputTokens.toLocaleString("de-DE")}</td>
                <td>{usd(z.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="material overflow-x-auto rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-semibold">Pool</h2>
        <p className="text-sm">
          {pool.map((p) => `${p.status}: ${p._count._all}`).join(" · ") || "noch leer"} · aktive Fragen mit Meldungen:{" "}
          {offeneMeldungen}
        </p>
      </section>

      <section className="material overflow-x-auto rounded-2xl p-4">
        <h2 className="mb-1 text-sm font-semibold">Schwierigkeit je Stufe ({TAGE} Tage)</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Ziel: Die Trefferquote fällt von Stufe 1 bis 5 deutlich. Liegen zwei Stufen gleichauf, unterscheidet der Prompt sie nicht.
        </p>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1">Stufe</th>
              <th className="py-1 text-right">Antworten</th>
              <th className="py-1 text-right">Richtig</th>
              <th className="py-1 text-right">Ø Zeit</th>
            </tr>
          </thead>
          <tbody>
            {stufen.map((z) => (
              <tr key={z.difficulty} className="border-t">
                <td className="py-1">{z.difficulty}</td>
                <td className="py-1 text-right">{Number(z.n)}</td>
                <td className="py-1 text-right">{pct(Number(z.n) > 0 ? Number(z.richtig) / Number(z.n) : null)}</td>
                <td className="py-1 text-right">{z.ms ? `${Math.round(z.ms / 1000)} s` : "—"}</td>
              </tr>
            ))}
            {stufen.length === 0 && (
              <tr>
                <td colSpan={4} className="py-2 text-muted-foreground">
                  Noch keine Antworten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="material overflow-x-auto rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-semibold">Je Tag</h2>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1">Tag</th><th>Aktive</th><th>Ausgeliefert</th><th>Beantwortet</th>
              <th>Generierungen</th><th>Fehlgeschl.</th><th>Registr.</th><th>Abos</th>
            </tr>
          </thead>
          <tbody>
            {tagesKeys.map((tag) => (
              <tr key={tag} className="border-t">
                <td className="py-1">{tag}</td>
                <td>{aktivAmTag(tag)}</td>
                <td>{wert(tag, "question_served")}</td>
                <td>{wert(tag, "question_answered")}</td>
                <td>{wert(tag, "generation_requested")}</td>
                <td>{wert(tag, "generation_failed")}</td>
                <td>{wert(tag, "signup")}</td>
                <td>{wert(tag, "subscription_started")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
