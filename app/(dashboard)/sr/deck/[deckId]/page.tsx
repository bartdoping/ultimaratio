// app/(dashboard)/sr/deck/[deckId]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import SRRunnerClient from "@/components/sr-runner-client"

export const runtime = "nodejs"

type Props = { params: Promise<{ deckId: string }> }

export default async function SRDeckPage({ params }: Props) {
  const { deckId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: { id: true, userId: true, title: true },
  })
  if (!deck || deck.userId !== me.id) notFound()

  // --- SR Guards: nur starten, wenn SR-Tabellen existieren und SR für dieses Deck (und global) aktiviert ist ---

  // 1) Existiert die Deck-Settings-Tabelle überhaupt?
  const deckTblExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'SRDeckSetting' AND relkind = 'r'
    ) AS "exists";
  `
  if (!deckTblExists?.[0]?.exists) {
    // SR wurde noch nie initialisiert -> zu den Einstellungen
    redirect("/sr/settings")
  }

  // 2) SR-Flag für dieses Deck prüfen
  const deckFlag = await prisma.$queryRaw<{ srEnabled: boolean }[]>`
    SELECT "srEnabled" FROM "SRDeckSetting" WHERE "deckId" = ${deckId} LIMIT 1;
  `
  if (!deckFlag?.[0]?.srEnabled) {
    // Für dieses Deck nicht aktiv
    redirect("/sr/settings")
  }

  // 3) (Optional) Global-Flag prüfen, falls Tabelle existiert
  const userTblExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'SRUserSetting' AND relkind = 'r'
    ) AS "exists";
  `
  if (userTblExists?.[0]?.exists) {
    const globalFlag = await prisma.$queryRaw<{ srEnabled: boolean }[]>`
      SELECT "srEnabled" FROM "SRUserSetting" WHERE "userId" = ${me.id} LIMIT 1;
    `
    if (globalFlag.length && !globalFlag[0].srEnabled) {
      redirect("/sr/settings")
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">SR · {deck.title}</h1>
      {/* ✅ mode + deckId werden gesetzt */}
      <SRRunnerClient mode="deck" deckId={deckId} />
    </div>
  )
}