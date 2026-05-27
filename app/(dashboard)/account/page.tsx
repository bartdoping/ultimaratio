// app/(dashboard)/account/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/db"
import AccountClient from "./account-client"
import { SettingsShell } from "@/components/settings/settings-shell"
import { GeneratorAccountSummary } from "@/components/account/generator-summary"

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
    },
  })
  if (!me) notFound()

  const purchases = await prisma.purchase.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    include: { exam: true },
  })

  return (
    <SettingsShell
      title="Account"
      description="Persönliche Daten, Login, Abo und Generator-Nutzung."
    >
      <GeneratorAccountSummary />
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
