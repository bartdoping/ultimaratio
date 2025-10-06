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

/* ---------- schnelle, einheitliche Tooltips ---------- */
function InfoBadge({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center align-middle ml-2 group">
      {/* „i“-Icon */}
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[11px] leading-none cursor-help select-none"
        aria-label="Info"
        tabIndex={0}
      >
        i
      </span>

      {/* Container für Transition & Positionierung */}
      <span
        className={[
          "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          "transition-opacity duration-75 ease-out",
        ].join(" ")}
        role="tooltip"
      >
        {/* Tooltip-Box: feste, einheitliche Breite */}
        <span
          className={[
            "relative block w-80 sm:w-96 rounded-md border bg-popover text-popover-foreground",
            "p-3 text-xs leading-relaxed shadow-lg whitespace-normal",
          ].join(" ")}
        >
          {/* Pfeil */}
          <span
            className={[
              "pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2",
              "h-2 w-2 rotate-45 bg-popover",
              "border-l border-t",
            ].join(" ")}
          />
          {text}
        </span>
      </span>
    </span>
  )
}

function FieldLabel({
  htmlFor,
  children,
  info,
}: {
  htmlFor?: string
  children: React.ReactNode
  info: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor} className="font-medium">
        {children}
      </Label>
      <InfoBadge text={info} />
    </div>
  )
}

/* ---------- helpers ---------- */
async function ensureSrTables() {
  try {
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
  } catch (error) {
    console.error("Error creating SR tables:", error)
    // Tabellen existieren möglicherweise bereits oder es gibt ein Berechtigungsproblem
    // Das ist nicht kritisch, da die Queries später mit try-catch behandelt werden
  }
}

/* ---------- actions ---------- */
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

/* ---------- page ---------- */
export default async function SRSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, name: true } })
  if (!me) redirect("/login")

  await ensureSrTables()

  // global - mit Fehlerbehandlung
  let global = {
    srEnabled: true,
    dailyNewLimit: 20,
    maxReviewsPerDay: 200,
    easeFactorStart: 2.5,
    intervalMinDays: 1,
    lapsePenalty: 0.5,
  }

  try {
    const globalRows = await prisma.$queryRaw<
      { srEnabled: boolean; dailyNewLimit: number; maxReviewsPerDay: number; easeFactorStart: number; intervalMinDays: number; lapsePenalty: number }[]
    >`SELECT "srEnabled","dailyNewLimit","maxReviewsPerDay","easeFactorStart","intervalMinDays","lapsePenalty" FROM "SRUserSetting" WHERE "userId"=${me.id}`

    if (globalRows && globalRows[0]) {
      global = globalRows[0]
    }
  } catch (error) {
    console.error("Error loading SR settings:", error)
    // Fallback zu Default-Werten
  }

  // decks
  const decks = await prisma.deck.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  })
  const deckIds = decks.map(d => d.id)

  // per-deck flags - mit Fehlerbehandlung
  let deckFlags: { deckId: string; srEnabled: boolean }[] = []
  let srEnabledMap = new Map<string, boolean>()

  try {
    if (deckIds.length > 0) {
      deckFlags = await prisma.$queryRaw<{ deckId: string; srEnabled: boolean }[]>`
        SELECT "deckId","srEnabled" FROM "SRDeckSetting" WHERE "deckId" IN (${Prisma.join(deckIds)})
      `
      srEnabledMap = new Map(deckFlags.map(r => [r.deckId, r.srEnabled]))
    }
  } catch (error) {
    console.error("Error loading deck SR settings:", error)
    // Fallback zu leeren Maps
  }

  // due totals (nur SR-Decks) - mit Fehlerbehandlung
  const enabledDeckIds = deckFlags.filter(r => r.srEnabled).map(r => r.deckId)
  let dueTotal = 0
  let perDeckDue = new Map<string, number>()

  try {
    if (enabledDeckIds.length > 0) {
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
  } catch (error) {
    console.error("Error loading due totals:", error)
    // Fallback zu 0
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
          <CardDescription>Gilt für alle SR-Decks (Limits & Parameter des Algorithmus).</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveGlobalAction} className="space-y-6">
            {/* Global aktiv */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="font-medium">SR global aktivieren</Label>
                <InfoBadge text="Wenn deaktiviert, ist Spaced Repetition für dein Konto komplett aus – auch wenn einzelne Decks als aktiv markiert sind." />
              </div>
              <input
                type="checkbox"
                name="srEnabled"
                defaultChecked={global.srEnabled}
                className="h-5 w-5 accent-current"
                aria-label="SR global aktivieren"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <FieldLabel
                  htmlFor="dailyNewLimit"
                  info="Max. Anzahl neuer Karten pro Tag. Höhere Werte beschleunigen den Aufbau, erhöhen aber die Folgetags-Last."
                >
                  Neue Karten pro Tag
                </FieldLabel>
                <Input id="dailyNewLimit" name="dailyNewLimit" type="number" min={0} defaultValue={global.dailyNewLimit} />
              </div>

              <div className="space-y-1">
                <FieldLabel
                  htmlFor="maxReviewsPerDay"
                  info="Obergrenze der Wiederholungen pro Tag. Darüber hinaus fällige Karten rutschen auf Folgetage."
                >
                  Max. Reviews pro Tag
                </FieldLabel>
                <Input id="maxReviewsPerDay" name="maxReviewsPerDay" type="number" min={0} defaultValue={global.maxReviewsPerDay} />
              </div>

              <div className="space-y-1">
                <FieldLabel
                  htmlFor="easeFactorStart"
                  info="Start-Leichtigkeitsfaktor (z. B. 2.5). Höher = Intervalle wachsen schneller."
                >
                  Start-Ease-Faktor
                </FieldLabel>
                <Input id="easeFactorStart" name="easeFactorStart" type="number" step="0.05" min={1.3} defaultValue={global.easeFactorStart} />
              </div>

              <div className="space-y-1">
                <FieldLabel
                  htmlFor="intervalMinDays"
                  info="Untergrenze des Wiederholungsabstands in Tagen. Verhindert zu kurze Intervalle."
                >
                  Minimum-Intervall (Tage)
                </FieldLabel>
                <Input id="intervalMinDays" name="intervalMinDays" type="number" min={1} defaultValue={global.intervalMinDays} />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <FieldLabel
                  htmlFor="lapsePenalty"
                  info="Straf-Faktor bei Fehlern (0.2–1.0). Multipliziert das alte Intervall, z. B. 0.5 halbiert es."
                >
                  Lapse-Penalty
                </FieldLabel>
                <Input id="lapsePenalty" name="lapsePenalty" type="number" step="0.05" min={0.2} max={1} defaultValue={global.lapsePenalty} />
              </div>
            </div>

            <div>
              <Button type="submit">Einstellungen speichern</Button>
              <span className="ml-3 text-xs text-muted-foreground">Wirkt auf zukünftige Berechnungen.</span>
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
                          <Button size="sm" variant="outline" disabled title="Aktiviere SR für dieses Deck, um hier zu üben.">
                            SR üben
                          </Button>
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