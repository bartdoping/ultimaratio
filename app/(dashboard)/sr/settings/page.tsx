// app/(dashboard)/sr/settings/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export const runtime = "nodejs"

// ---- helpers ----
async function ensureSrTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SRUserSetting" (
      "userId"           text PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "srEnabled"        boolean NOT NULL DEFAULT true,
      "dailyNewLimit"    integer NOT NULL DEFAULT 20,
      "maxReviewsPerDay" integer NOT NULL DEFAULT 200,
      "easeFactorStart"  double precision NOT NULL DEFAULT 2.5,
      "intervalMinDays"  integer NOT NULL DEFAULT 1,
      "lapsePenalty"     double precision NOT NULL DEFAULT 0.5,
      "lastGlobalRunAt"  timestamptz
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SRDeckSetting" (
      "deckId"    text PRIMARY KEY REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "srEnabled" boolean NOT NULL DEFAULT false
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SRDeckSetting_deckId_idx" ON "SRDeckSetting" ("deckId");
  `)
}

// ---- actions ----
async function saveGlobalAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) redirect("/login")

  await ensureSrTables()

  const srEnabled = formData.get("srEnabled") === "on"
  const dailyNewLimit = Math.max(0, Number(formData.get("dailyNewLimit") || 20))
  const maxReviewsPerDay = Math.max(0, Number(formData.get("maxReviewsPerDay") || 200))
  const easeFactorStart = Math.max(1.3, Number(formData.get("easeFactorStart") || 2.5))
  const intervalMinDays = Math.max(1, Number(formData.get("intervalMinDays") || 1))
  const lapsePenalty = Math.min(1, Math.max(0.2, Number(formData.get("lapsePenalty") || 0.5)))

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "SRUserSetting"(
      "userId","srEnabled","dailyNewLimit","maxReviewsPerDay",
      "easeFactorStart","intervalMinDays","lapsePenalty"
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT ("userId") DO UPDATE SET
      "srEnabled"=$2,"dailyNewLimit"=$3,"maxReviewsPerDay"=$4,
      "easeFactorStart"=$5,"intervalMinDays"=$6,"lapsePenalty"=$7
    `,
    me.id, srEnabled, dailyNewLimit, maxReviewsPerDay, easeFactorStart, intervalMinDays, lapsePenalty
  )

  redirect("/sr/settings")
}

async function toggleDeckAction(formData: FormData) {
  "use server"
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) redirect("/login")

  await ensureSrTables()

  const deckId = String(formData.get("deckId") || "")
  const enable = String(formData.get("enable") || "") === "1"

  // ownership
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } })
  if (!deck || deck.userId !== me.id) redirect("/sr/settings")

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "SRDeckSetting"("deckId","srEnabled")
    VALUES ($1,$2)
    ON CONFLICT ("deckId") DO UPDATE SET "srEnabled"=EXCLUDED."srEnabled"
    `,
    deckId, enable
  )

  redirect("/sr/settings")
}

// ---- page ----
export default async function SRSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, name: true } })
  if (!me) redirect("/login")

  await ensureSrTables()

  // load global
  const globalRows = await prisma.$queryRaw<
    { srEnabled: boolean; dailyNewLimit: number; maxReviewsPerDay: number; easeFactorStart: number; intervalMinDays: number; lapsePenalty: number }[]
  >`SELECT "srEnabled","dailyNewLimit","maxReviewsPerDay","easeFactorStart","intervalMinDays","lapsePenalty" FROM "SRUserSetting" WHERE "userId"=${me.id}`

  const global = globalRows[0] ?? {
    srEnabled: true,
    dailyNewLimit: 20,
    maxReviewsPerDay: 200,
    easeFactorStart: 2.5,
    intervalMinDays: 1,
    lapsePenalty: 0.5,
  }

  // all decks (own + auto)
  const decks = await prisma.deck.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  })
  const deckIds = decks.map(d => d.id)

  // per-deck flags
  const deckFlags = deckIds.length
    ? await prisma.$queryRaw<{ deckId: string; srEnabled: boolean }[]>`
        SELECT "deckId","srEnabled" FROM "SRDeckSetting" WHERE "deckId" IN (${Prisma.join(deckIds)})
      `
    : []
  const srEnabledMap = new Map(deckFlags.map(r => [r.deckId, r.srEnabled]))

  // due totals (nur Decks, die SR-enabled sind)
  const enabledDeckIds = deckFlags.filter(r => r.srEnabled).map(r => r.deckId)
  let dueTotal = 0
  let perDeckDue = new Map<string, number>()
  if (enabledDeckIds.length) {
    const tot = await prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*)::int AS cnt
      FROM "ReviewItem" ri
      JOIN "DeckItem" di ON di."questionId" = ri."questionId"
      WHERE ri."userId" = ${me.id}
        AND ri."dueAt" <= NOW()
        AND di."deckId" IN (${Prisma.join(enabledDeckIds)});
    `
    dueTotal = tot?.[0]?.cnt ?? 0

    const per = await prisma.$queryRaw<{ deckId: string; cnt: number }[]>`
      SELECT di."deckId", COUNT(*)::int AS cnt
      FROM "ReviewItem" ri
      JOIN "DeckItem" di ON di."questionId" = ri."questionId"
      WHERE ri."userId" = ${me.id}
        AND ri."dueAt" <= NOW()
        AND di."deckId" IN (${Prisma.join(enabledDeckIds)})
      GROUP BY di."deckId";
    `
    perDeckDue = new Map(per.map(r => [r.deckId, r.cnt]))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Spaced Repetition · Einstellungen</h1>
        <div className="flex items-center gap-2">
          {dueTotal > 0 && <Badge variant="default">Heute fällig: {dueTotal}</Badge>}
          <Link href="/dashboard"><Button variant="outline">Zurück zum Dashboard</Button></Link>
        </div>
      </div>

      {/* Global settings */}
      <Card>
        <CardHeader>
          <CardTitle>Global</CardTitle>
          <CardDescription>Gilt für alle SR-Decks (Limits & Algorithmen-Parameter).</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveGlobalAction} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="srEnabled" defaultChecked={global.srEnabled} />
                SR global aktivieren
              </label>
            </div>

            <div>
              <Label>Tägliches Limit neue Karten</Label>
              <Input name="dailyNewLimit" type="number" defaultValue={global.dailyNewLimit} />
            </div>
            <div>
              <Label>Max. Reviews / Tag</Label>
              <Input name="maxReviewsPerDay" type="number" defaultValue={global.maxReviewsPerDay} />
            </div>
            <div>
              <Label>Start-Ease-Faktor</Label>
              <Input name="easeFactorStart" type="number" step="0.05" defaultValue={global.easeFactorStart} />
            </div>
            <div>
              <Label>Minimal-Intervall (Tage)</Label>
              <Input name="intervalMinDays" type="number" defaultValue={global.intervalMinDays} />
            </div>
            <div className="sm:col-span-2">
              <Label>Lapse-Penalty (0.2–1.0)</Label>
              <Input name="lapsePenalty" type="number" step="0.05" defaultValue={global.lapsePenalty} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Deck list */}
      <Card>
        <CardHeader>
          <CardTitle>Decks</CardTitle>
          <CardDescription>SR je Deck an-/ausschalten. Fällige Karten je Deck werden angezeigt.</CardDescription>
        </CardHeader>
        <CardContent>
          {decks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Du hast noch keine Decks.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {decks.map(d => {
                const srOn = !!srEnabledMap.get(d.id)
                const due = perDeckDue.get(d.id) || 0
                return (
                  <Card key={d.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{d.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          {srOn && <Badge variant="secondary">SR aktiv</Badge>}
                          {srOn && due > 0 && <Badge variant="default">{due} fällig</Badge>}
                        </div>
                      </div>
                      {d.description && <CardDescription className="line-clamp-2">{d.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {d._count.items} Frage{d._count.items === 1 ? "" : "n"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link href={`/decks/${d.id}`}>
                          <Button size="sm" variant="outline">Öffnen</Button>
                        </Link>
                        {srOn ? (
                          <Link href={`/sr/deck/${d.id}`}>
                            <Button size="sm">SR üben</Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" disabled>SR üben</Button>
                        )}
                        <form action={toggleDeckAction}>
                          <input type="hidden" name="deckId" value={d.id} />
                          <input type="hidden" name="enable" value={srOn ? "0" : "1"} />
                          <Button size="sm" variant="ghost">
                            {srOn ? "SR deaktivieren" : "SR aktivieren"}
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}