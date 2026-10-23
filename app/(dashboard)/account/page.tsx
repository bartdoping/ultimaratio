// app/(dashboard)/account/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/db"
import AccountClient from "./account-client"
import { SettingsShell } from "@/components/settings/settings-shell"
import { GeneratorAccountSummary } from "@/components/account/generator-summary"
import { LearningSettings } from "@/components/account/learning-settings"
import { ReferralCard } from "@/components/account/referral-card"
import { ensureReferralCode } from "@/lib/referral"
import { getAppBaseUrl } from "@/lib/app-base-url"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      surname: true,
      email: true,
      createdAt: true,
      reminderOptIn: true,
      dailyGoal: true,
      proBonusUntil: true,
    },
  })
  if (!me) notFound()

  const [refCode, eingeladen, belohnt] = await Promise.all([
    ensureReferralCode(me.id).catch(() => null),
    prisma.user.count({ where: { referredById: me.id } }),
    prisma.user.count({ where: { referredById: me.id, referralRewardedAt: { not: null } } }),
  ])
  const bonusAktiv = me.proBonusUntil && me.proBonusUntil.getTime() > Date.now()

  const purchases = await prisma.purchase.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    include: { exam: true },
  })

  return (
    <SettingsShell
      title="Account"
      description="Persönliche Daten, Login, Abo, Lernziel und Erinnerungen."
    >
      <GeneratorAccountSummary />
      <LearningSettings initialOptIn={me.reminderOptIn} initialGoal={me.dailyGoal} />
      {refCode && (
        <ReferralCard
          link={`${getAppBaseUrl()}/r/${refCode}`}
          eingeladen={eingeladen}
          belohnt={belohnt}
          bonusUntil={bonusAktiv ? me.proBonusUntil!.toISOString() : null}
        />
      )}
      <AccountClient
        user={{
          id: me.id,
          name: me.name ?? "",
          surname: me.surname ?? "",
          email: me.email,
          createdAt: me.createdAt.toISOString(),
        }}
        purchases={purchases.map((p) => ({
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          examTitle: p.exam.title,
          priceCents: p.exam.priceCents || 0,
        }))}
      />
    </SettingsShell>
  )
}
